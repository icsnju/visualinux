import type { Config } from "tailwindcss";

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
    'bg-[#FFFFFF]', 'bg-[#ECECEC]', 'bg-[#DCDCDC]', 'bg-[#B7B7B7]',
    'bg-[#FCFFFC]', 'bg-[#FBFFFB]', 'bg-[#F0FFF0]', 'bg-[#ECFFEC]', 
    'bg-[#FFFCFC]', 'bg-[#FFFBFB]', 'bg-[#FFF0F0]', 'bg-[#FFECEC]',
    'border-[#228B22]', 'border-[#DC143C]',
    'text-[#228B22]', 'text-[#DC143C]',
  ],
};
export default config;
