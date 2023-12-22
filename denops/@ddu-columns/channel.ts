import { dduVim, dduVimColumn } from "../traqvim/deps.ts";

export type Params = {
  collapsedParentIcon: string;
  expandedParentIcon: string;
  leafIcon: string;
  indentationWidth: number;
};

export class Column extends dduVim.BaseColumn<Params> {
  getLength({}: dduVimColumn.GetLengthArguments<Params>): Promise<number> {
    throw new Error("Method not implemented.");
  }
  getText(
    {}: dduVimColumn.GetTextArguments<Params>,
  ): Promise<dduVimColumn.GetTextResult> {
    throw new Error("Method not implemented.");
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
