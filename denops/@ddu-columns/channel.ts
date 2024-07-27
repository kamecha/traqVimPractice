import { dduVim, dduVimColumn, ensure, fn, is } from "../traqvim/deps.ts";

export type Params = {
  collapsedParentIcon: string;
  expandedParentIcon: string;
  leafIcon: string;
  indentationWidth: number;
};

export class Column extends dduVim.BaseColumn<Params> {
  getLength(
    args: dduVimColumn.GetLengthArguments<Params>,
  ): Promise<number> {
    const iconWidth = Math.max(
      args.columnParams.collapsedParentIcon.length,
      args.columnParams.expandedParentIcon.length,
      args.columnParams.leafIcon.length,
    );
    const widths: number[] = args.items.map((item) => {
      const length = args.columnParams.indentationWidth * item.__level +
        iconWidth +
        1 +
        item.word.length;
      return length;
    });
    return Promise.resolve(Math.max(...widths));
  }
  async getText(
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
    const width = ensure(await fn.strwidth(args.denops, text), is.Number);
    const padding = " ".repeat(args.endCol - args.startCol - width);
    return Promise.resolve({
      text: text + padding,
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
