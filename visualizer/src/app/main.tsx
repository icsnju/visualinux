'use client'

import { GlobalStateProvider } from "@app/state";
import MainWindow from "@app/window/window";

import { View } from "@app/visual/type";

export default function MainWrapper({ initData }: { initData?: View }) {
    return (
        <GlobalStateProvider initData={initData}>
            <MainWindow/>
        </GlobalStateProvider>
    );
}
