import { type MouseEvent, useMemo } from "react";
import { type PageLink } from "../../lib/api";

export function RichHtml({
  className,
  helpContext,
  html,
  links,
  onDiceRoll,
  onContextLink,
  onOpenLink,
  onPeekLink,
  tabIndex
}: {
  className?: string;
  helpContext?: string;
  html: string;
  links: PageLink[];
  onDiceRoll?: (expression: string) => void;
  onContextLink?: (link: PageLink, event: MouseEvent<HTMLElement>) => void;
  onOpenLink: (link: PageLink) => void;
  onPeekLink?: (link: PageLink) => void;
  tabIndex?: number;
}) {
  function linkFromEvent(event: MouseEvent<HTMLElement>): PageLink | null {
    const target = event.target instanceof Element ? event.target : null;
    const linkElement = target?.closest("[data-world-link-index]");
    if (!linkElement) {
      return null;
    }
    const index = Number(linkElement.getAttribute("data-world-link-index"));
    return links[index] ?? null;
  }

  function diceExpressionFromEvent(event: MouseEvent<HTMLElement>): string | null {
    const target = event.target instanceof Element ? event.target : null;
    const linkElement = target?.closest("[data-dice-expression]");
    return linkElement?.getAttribute("data-dice-expression") ?? null;
  }

  function handleClick(event: MouseEvent<HTMLElement>) {
    const diceExpression = diceExpressionFromEvent(event);
    if (diceExpression && onDiceRoll) {
      event.preventDefault();
      onDiceRoll(diceExpression);
      return;
    }
    const link = linkFromEvent(event);
    if (link) {
      event.preventDefault();
      // The pane behind this text activates its own tab on click. Without stopping here,
      // that runs after the link opened a new tab and pulls the selection back to the old
      // one: the pane then shows one file while the tab strip highlights another, and the
      // opened file gets no editor draft, so its Save and Run actions never appear.
      event.stopPropagation();
      if ((event.altKey || event.shiftKey) && onPeekLink) {
        onPeekLink(link);
        return;
      }
      onOpenLink(link);
    }
  }

  function handleAuxClick(event: MouseEvent<HTMLElement>) {
    if (event.button !== 1) {
      return;
    }
    const link = linkFromEvent(event);
    if (link && onPeekLink) {
      event.preventDefault();
      onPeekLink(link);
    }
  }

  function handleContextMenu(event: MouseEvent<HTMLElement>) {
    const link = linkFromEvent(event);
    if (link && onContextLink) {
      event.preventDefault();
      onContextLink(link, event);
    }
  }

  // Memoised on the string, not rebuilt inline, and that is load-bearing rather than an
  // optimisation. React 19 compares this prop by object IDENTITY and then assigns
  // innerHTML unconditionally (react-dom setProp: `domElement.innerHTML = key`), where
  // React 18 compared the html string first. A fresh `{ __html }` on every render
  // therefore tore down and rebuilt every child node on any re-render - taking the
  // user's text selection with it, so page text could not be selected or copied.
  const innerHtml = useMemo(() => ({ __html: html }), [html]);

  return (
    <div
      className={className}
      data-help-context={helpContext}
      dangerouslySetInnerHTML={innerHtml}
      onAuxClick={handleAuxClick}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      tabIndex={tabIndex}
    />
  );
}
