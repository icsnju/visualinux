import type { Config } from "tailwindcss";
import * as sc from "./src/visual/nodes/styleconf";

const diffChoices  = [undefined, false, true];
const depthChoices = [0, 1, 2, 3];

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
  safelist: [
    ...(diffChoices.flatMap(v => [
      `text-${sc.TextColor(v)}`, `border-${sc.TextColor(v)}`,
    ])),
    `text-${sc.TextColorMod()}`, `border-${sc.TextColorMod()}`,
    ...(depthChoices.flatMap(d => diffChoices.map(v => 
      `bg-${sc.BgColor(d, v)}`
    ))),
    ...(diffChoices.map(v => 
      `bg-${sc.BgColorContainer(v)}`,
    )),
    // 'bg-[#FCFFFC]', 'bg-[#FBFFFB]', 'bg-[#F0FFF0]', 'bg-[#ECFFEC]', 
    // 'bg-[#FFFCFC]', 'bg-[#FFFBFB]', 'bg-[#FFF0F0]', 'bg-[#FFECEC]',
    // 'border-[#228B22]', 'border-[#DC143C]',
    // 'text-[#228B22]', 'text-[#DC143C]', 'text-[#2B2BE6]',
  ],
};
export default config;
