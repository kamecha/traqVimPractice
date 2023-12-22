import { dduVim, dduVimColumn } from "../traqvim/deps.ts";

export type Params = {
  collapsedParentIcon: string;
  expandedParentIcon: string;
  leafIcon: string;
  indentationWidth: number;
};

export class Column extends dduVim.BaseColumn<Params> {
  // TODO: ↓この関数が何やってるのか調べとく
  // 現状0を返してるけど、なんかちゃんと表示されちゃってる
  getLength(
    args: dduVimColumn.GetLengthArguments<Params>,
  ): Promise<number> {
    const widths: number[] = args.items.map((item) => {
      // TODO: ↓ここでdisplayが空文字列になってるので、原因調べとく
      const display = item.display ?? item.word;
      return display.length;
    });
    return Promise.resolve(Math.max(...widths));
  }
  getText(
    args: dduVimColumn.GetTextArguments<Params>,
  ): Promise<dduVimColumn.GetTextResult> {
    const parentIcon = args.item.__expanded
      ? args.columnParams.expandedParentIcon
      : args.columnParams.collapsedParentIcon;
    const isParent = args.item.isTree ?? false;
    const icon = isParent ? parentIcon : args.columnParams.leafIcon;
    const text =
      " ".repeat(args.columnParams.indentationWidth * args.item.__level) +
      icon + " " + args.item.word;
    return Promise.resolve({
      text,
    });
  }
  params(): Params {
    return {
      collapsedParentIcon: "󱅿",
      expandedParentIcon: "󰐤",
      leafIcon: "󰐣",
      indentationWidth: 2,
    };
  }
}
