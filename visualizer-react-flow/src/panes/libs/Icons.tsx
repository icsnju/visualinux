import { SVGProps } from 'react';

export function AkarIconsAugmentedReality(props: SVGProps<SVGSVGElement>) {
    console.log('AkarIconsAugmentedReality', props);
	return (
        <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" {...props}>
            <g fill="none" stroke={props.color} strokeLinejoin="round" strokeWidth={2}>
                <path strokeLinecap="round" d="M10.971 6.617a2 2 0 0 1 2.058 0l3.486 2.092a1 1 0 0 1 .485.857v4.302a2 2 0 0 1-.971 1.715l-3 1.8a2 2 0 0 1-2.058 0l-3-1.8A2 2 0 0 1 7 13.868V9.566a1 1 0 0 1 .486-.857z"></path>
                <path d="m7 9l5 2.759m0 0L17 9m-5 2.759V17"></path>
                <path strokeLinecap="round" d="M6 2H4a2 2 0 0 0-2 2v2m16 16h2a2 2 0 0 0 2-2v-2m0-12V4a2 2 0 0 0-2-2h-2M2 18v2a2 2 0 0 0 2 2h2"></path>
            </g>
        </svg>
    );
}