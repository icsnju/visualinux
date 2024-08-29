export type colorId = string;

export type StyleSet = {
    layout: {
        width: number,
        spacing: number
    },
    box: BoxStyleSet[],
    primitive: PrimStyleSet[],
    link: {
        color: colorId
    },
    selection: {
        color: colorId
    }
}

export type BoxStyleSet = {
    color: {
        bg_title: colorId,
        bg_inner: colorId,
        frame: colorId,
        font: colorId,
    },
    // "font-style font-variant font-weight font-size font-family"
    // "13px sans-serif" by default.
    font: string,
    shadowed?: boolean
}

export type PrimStyleSet = {
    color: {
        bg_label: colorId,
        bg_value: colorId,
        bg_linkdot: colorId,
        frame: colorId,
        font_label: colorId,
        font_value: colorId
    },
    font: string
}

export let styleset: StyleSet = {
    "layout": {
        "width": 256,
        "spacing": 8
    },
    "box": [{
        "color": {
            "bg_title": "#FFFFFF",
            "bg_inner": "#FFFFFF",
            "frame":    "#000000",
            "font":     "#000000"
        },
        "font": "17px Inconsolata, Times New Roman"
    }, {
        "color": {
            "bg_title": "#CCCCCC",
            "bg_inner": "#CCCCCC",
            "frame":    "#000000",
            "font":     "#000000"
        },
        "font": "13px Inconsolata, Times New Roman"
    }, {
        "color": {
            "bg_title": "#EDEDED",
            "bg_inner": "#EDEDED",
            "frame":    "#000000",
            "font":     "#000000"
        },
        "font": "13px Inconsolata, Times New Roman"
    }],
    "primitive": [{
        "color": {
            "bg_label": "transparent",
            "bg_value": "transparent",
            "bg_linkdot": "transparent",
            "frame": "#000000",
            "font_label": "#000000",
            "font_value": "#000000"
        },
        "font": "13px Inconsolata, Times New Roman"
    }],
    "link": {
        "color": "#000000"
    },
    "selection": {
        "color": "#FF6FFF"
    }
};
