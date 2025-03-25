// color

//// text color (also used for border)

const textColorNormal  = '#000000';
const textColorDiffAdd = '#228B22';
const textColorDiffDel = '#DC143C';
const textColorDiffMod = '#2B2BE6';

export const TextColor = (isDiffAdd: boolean | undefined) => {
    if (isDiffAdd === undefined) {
        return textColorNormal;
    }
    return isDiffAdd ? textColorDiffAdd : textColorDiffDel;
};
export const TextColorMod = () => textColorDiffMod;

//// bg color

const bgColorNormal:  string[] = ['#FFFFFF', '#ECECEC', '#DCDCDC', '#B7B7B7'];
const bgColorDiffAdd: string[] = ['#FBFFFB', '#F0FFF0', '#ECFFEC', '#ECFFEC'];
const bgColorDiffDel: string[] = ['#FFFBFB', '#FFF0F0', '#FFECEC', '#FFECEC'];

const getItemSafe = (list: string[], depth: number) => {
    return depth < list.length ? list[depth] : list[list.length - 1];
};

export const BgColor = (depth: number, isDiffAdd: boolean | undefined) => {
    if (isDiffAdd === undefined) {
        return getItemSafe(bgColorNormal, depth);
    }
    return isDiffAdd ? getItemSafe(bgColorDiffAdd, depth) : getItemSafe(bgColorDiffDel, depth);
};

const bgColorContNormal  = '#FFFFFF';
const bgColorContDiffAdd = '#FCFFFC';
const bgColorContDiffDel = '#FFFCFC';

export const BgColorContainer = (isDiffAdd: boolean | undefined) => {
    if (isDiffAdd === undefined) {
        return bgColorContNormal;
    }
    return isDiffAdd ? bgColorContDiffAdd : bgColorContDiffDel;
};

// size

//// field size (used for auto newline and height estimation)

const labelBaseCPL = 11;
const valueBaseCPL = 24;

const TextSplit = (text: string, charPerLine: number) => {
    const lines = text.match(new RegExp(`.{1,${charPerLine}}`, 'g')) || [text];
    return lines;
}

// for better visualization effect, try the best to avoid newline in label
export const TextFieldAdaption = (label: string, value: string, oldvl: string | undefined, depth: number) => {
    // original lines situ
    let labelCPL = labelBaseCPL - depth;
    let valueCPL = valueBaseCPL - depth;
    let labelLines = TextSplit(label, labelCPL);
    let valueLines = TextSplit(value, valueCPL);
    let oldvlLines = oldvl ? TextSplit(oldvl, valueCPL) : [];
    let valueMaxLen = Math.max(
        ...valueLines.map(line => line.length),
        ...oldvlLines.map(line => line.length),
    );
    // maximize labelCPL while value line count is not affected
    let labelDelta = 0;
    if (labelLines.length > 1 && valueMaxLen < valueCPL) {
        labelDelta = Math.min(
            labelLines[1].length,
            valueCPL - valueMaxLen,
        );
        let newLabelLines = TextSplit(label, labelCPL + labelDelta);
        if (newLabelLines.length < labelLines.length) {
            labelCPL += labelDelta;
            valueCPL = valueMaxLen;
            labelLines = newLabelLines;
            valueLines = TextSplit(value, valueCPL);
            oldvlLines = oldvl ? TextSplit(oldvl, valueCPL) : [];
        } else {
            labelDelta = 0;
        }
    }
    // return
    return { labelDelta, labelLines, valueLines, oldvlLines };
};

//// node size

export const boxNodeWidth = 296;
export const boxNodeHeightCollapsed = 32;

export const textPadding = 3;
