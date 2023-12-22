import { dduVim, dduVimColumn } from "../traqvim/deps.ts";

export type Params = {
  collapsedParentIcon: string;
  expandedParentIcon: string;
  leafIcon: string;
  indentationWidth: number;
};

export class Column extends dduVim.BaseColumn<Params> {
  // getTextで使われるendColとかの計算に使われるらしい
  // 事前にcolumnの概要だけを計算してるっぽい
  getLength(
    args: dduVimColumn.GetLengthArguments<Params>,
  ): Promise<number> {
    const widths: number[] = args.items.map((item) => {
      // ddu側がcolumnを一個づつ適用させる時にどんどんdisplayが追加されるらしい
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
