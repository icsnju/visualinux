// Color

const textColorNormal  = 'black';
const textColorDiffAdd = '[#228B22]';
const textColorDiffDel = '[#DC143C]';
const textColorDiffMod = '[#2B2BE6]';

export const TextColor = (isDiffAdd: boolean | undefined) => {
    if (isDiffAdd === undefined) {
        return textColorNormal;
    }
    return isDiffAdd ? textColorDiffAdd : textColorDiffDel;
};
export const TextColorMod = () => textColorDiffMod;

const bgColorNormal:  string[] = ['[#FFFFFF]', '[#ECECEC]', '[#DCDCDC]', '[#B7B7B7]'];
const bgColorDiffAdd: string[] = ['[#FBFFFB]', '[#F0FFF0]', '[#ECFFEC]', '[#ECFFEC]'];
const bgColorDiffDel: string[] = ['[#FFFBFB]', '[#FFF0F0]', '[#FFECEC]', '[#FFECEC]'];

const getItemSafe = (list: string[], depth: number) => {
    return depth < list.length ? list[depth] : list[list.length - 1];
};

export const BgColor = (depth: number, isDiffAdd: boolean | undefined) => {
    if (isDiffAdd === undefined) {
        return getItemSafe(bgColorNormal, depth);
    }
    return isDiffAdd ? getItemSafe(bgColorDiffAdd, depth) : getItemSafe(bgColorDiffDel, depth);
};

const bgColorContNormal  = '[#FFFFFF]';
const bgColorContDiffAdd = '[#FCFFFC]';
const bgColorContDiffDel = '[#FFFCFC]';

export const BgColorContainer = (isDiffAdd: boolean | undefined) => {
    if (isDiffAdd === undefined) {
        return bgColorContNormal;
    }
    return isDiffAdd ? bgColorContDiffAdd : bgColorContDiffDel;
};

// Size

export const boxNodeWidth = 272;
export const boxNodeHeightCollapsed = 32;

export const textPadding = 3;
