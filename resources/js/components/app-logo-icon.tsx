import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Outer rounded hexagon / shield frame */}
            <rect
                x="2"
                y="2"
                width="36"
                height="36"
                rx="10"
                fill="currentColor"
                fillOpacity="0.14"
            />
            {/* Top database layer */}
            <path
                d="M20 7L32 13L20 19L8 13L20 7Z"
                fill="currentColor"
            />
            {/* Middle modular BaaS layer */}
            <path
                d="M8 18.5L20 24.5L32 18.5V22.5L20 28.5L8 22.5V18.5Z"
                fill="currentColor"
                fillOpacity="0.85"
            />
            {/* Bottom isolated SQLite storage layer with Zenbase Z bolt */}
            <path
                d="M8 26.5L20 32.5L32 26.5V30.5L20 36.5L8 30.5V26.5Z"
                fill="currentColor"
                fillOpacity="0.65"
            />
        </svg>
    );
}
