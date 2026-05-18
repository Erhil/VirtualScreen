import random
import re
from dataclasses import dataclass
from typing import Protocol

DICE_EXPRESSION_PATTERN = r"\s*(\d*)d(\d+)(?:\s*([+-])\s*(\d+))?\s*"
DICE_COUNT_MIN = 1
DICE_COUNT_MAX = 100
DICE_SIDES_MIN = 1
DICE_SIDES_MAX = 10000


class DiceRng(Protocol):
    def randint(self, a: int, b: int) -> int: ...


@dataclass(frozen=True)
class ParsedDiceExpression:
    expression: str
    count: int
    sides: int
    modifier: int


@dataclass(frozen=True)
class DiceRoll:
    expression: str
    count: int
    sides: int
    results: list[int]
    modifier: int
    total: int

    @property
    def detail(self) -> str:
        values = " + ".join(str(value) for value in self.results)
        if self.modifier > 0:
            return f"{self.count}d{self.sides}: {values} + {self.modifier} = {self.total}"
        if self.modifier < 0:
            return f"{self.count}d{self.sides}: {values} - {abs(self.modifier)} = {self.total}"
        return f"{self.count}d{self.sides}: {values} = {self.total}"


def parse_dice_expression(expr: object) -> ParsedDiceExpression:
    expression = str(expr or "").strip()
    match = re.fullmatch(DICE_EXPRESSION_PATTERN, expression)
    if not match:
        raise ValueError("Dice expression must look like 1d20+3.")
    count = int(match.group(1) or "1")
    sides = int(match.group(2))
    sign = match.group(3)
    modifier = int(match.group(4) or "0")
    if sign == "-":
        modifier = -modifier
    if (
        count < DICE_COUNT_MIN
        or count > DICE_COUNT_MAX
        or sides < DICE_SIDES_MIN
        or sides > DICE_SIDES_MAX
    ):
        raise ValueError("Dice expression is out of supported range.")
    return ParsedDiceExpression(
        expression=expression,
        count=count,
        sides=sides,
        modifier=modifier,
    )


def roll_dice_expression(expr: object, rng: DiceRng = random) -> DiceRoll:
    parsed = parse_dice_expression(expr)
    results = [rng.randint(1, parsed.sides) for _ in range(parsed.count)]
    total = sum(results) + parsed.modifier
    return DiceRoll(
        expression=parsed.expression,
        count=parsed.count,
        sides=parsed.sides,
        results=results,
        modifier=parsed.modifier,
        total=total,
    )
