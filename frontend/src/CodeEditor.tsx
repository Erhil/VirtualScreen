import { autocompletion, type CompletionContext } from "@codemirror/autocomplete";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo } from "react";

import {
  completionResultForTextBeforeCursor,
  type EditorAutocompleteMode,
  type EditorCompletion
} from "./lib/editorAutocomplete";
import { shouldStopEditorHotkeyPropagation } from "./lib/editor";

export type CodeEditorLanguage = "markdown" | "python" | "text";

type CodeEditorProps = {
  ariaLabel: string;
  language: CodeEditorLanguage;
  value: string;
  onChange: (value: string) => void;
  completions?: CodeEditorCompletion[];
};

export type CodeEditorCompletion = EditorCompletion;

const compactEditorTheme = EditorView.theme({
  "&": {
    backgroundColor: "#fffaf0",
    color: "#241f1b",
    fontSize: "14px",
    height: "100%"
  },
  ".cm-content": {
    caretColor: "#6b4a1f",
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
    minHeight: "100%",
    padding: "10px"
  },
  ".cm-focused": {
    outline: "none"
  },
  ".cm-gutters": {
    backgroundColor: "#f3ead8",
    borderRight: "1px solid #d8ccb9",
    color: "#786c5c"
  },
  ".cm-scroller": {
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
  }
});

function languageExtension(language: CodeEditorLanguage): Extension[] {
  if (language === "markdown") {
    return [markdown()];
  }
  if (language === "python") {
    return [python()];
  }
  return [];
}

function completionModeForLanguage(language: CodeEditorLanguage): EditorAutocompleteMode | null {
  if (language === "markdown") {
    return "markdown";
  }
  if (language === "python") {
    return "dms";
  }
  return null;
}

export function CodeEditor({
  ariaLabel,
  language,
  value,
  onChange,
  completions = []
}: CodeEditorProps) {
  const completionExtension = useMemo(() => {
    const completionMode = completionModeForLanguage(language);
    if (completions.length === 0 || !completionMode) {
      return [];
    }
    return [
      autocompletion({
        override: [
          (context: CompletionContext) => {
            const result = completionResultForTextBeforeCursor(
              context.state.sliceDoc(0, context.pos),
              completionMode,
              completions,
              context.explicit
            );
            if (!result) {
              return null;
            }
            return {
              from: result.from,
              options: result.options.map((option) => {
                if (option.replaceFrom === undefined) {
                  return option;
                }
                const insert = option.apply;
                const replaceFrom = option.replaceFrom;
                return {
                  ...option,
                  apply: (view: EditorView, _completion: unknown, _from: number, to: number) => {
                    view.dispatch({
                      changes: { from: replaceFrom, to, insert },
                      selection: { anchor: replaceFrom + insert.length }
                    });
                  }
                };
              })
            };
          }
        ]
      })
    ];
  }, [completions, language]);

  const extensions = useMemo(
    () => [
      EditorView.contentAttributes.of({
        "aria-label": ariaLabel,
        role: "textbox"
      }),
      EditorView.lineWrapping,
      compactEditorTheme,
      ...languageExtension(language),
      ...completionExtension
    ],
    [ariaLabel, completionExtension, language]
  );

  return (
    <div
      className="code-editor"
      onKeyDownCapture={(event) => {
        if (shouldStopEditorHotkeyPropagation(event)) {
          event.stopPropagation();
        }
      }}
    >
      <CodeMirror
        basicSetup={false}
        extensions={extensions}
        height="100%"
        onChange={onChange}
        value={value}
      />
    </div>
  );
}
