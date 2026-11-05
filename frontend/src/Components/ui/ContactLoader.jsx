import React from "react";

const ContactLoader = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Blurred background overlay */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>

      {/* Centered loader */}
      <div className="relative z-10 flex items-center justify-center">
        <svg
          width="100"
          height="100"
          viewBox="0 0 240 240"
          className="scale-110"
        >
          <g transform="translate(40, 60)">
            <g>
              <animate
                attributeName="transform"
                values="translate(0,0); translate(0,-2); translate(0,0); translate(0,-1); translate(0,0)"
                dur="1s"
                repeatCount="indefinite"
              />

              {/* Cart handle with smooth curve */}
              <path
                d="M 8 35 Q 12 18, 22 28 L 28 35"
                stroke="#1f2937"
                className=""
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              />

              {/* Cart body - realistic proportions */}
              <path
                d="M 28 35 L 140 35 L 132 90 L 36 90 Z"
                stroke="#1f2937"
                className=""
                strokeWidth="4"
                fill="none"
                strokeLinejoin="round"
              />

              {/* Cart inner detail line */}
              <path
                d="M 32 42 L 136 42 L 129 83 L 39 83 Z"
                stroke="#1f2937"
                className=""
                strokeWidth="1.5"
                fill="none"
                strokeLinejoin="round"
                opacity="0.3"
              />

              {/* Cart bottom support bar */}
              <line
                x1="36"
                y1="90"
                x2="132"
                y2="90"
                stroke="#1f2937"
                className=""
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Left wheel - detailed */}
              <g>
                <circle
                  cx="55"
                  cy="105"
                  r="11"
                  stroke="#1f2937"
                  className=""
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="55"
                  cy="105"
                  r="6"
                  stroke="#1f2937"
                  className=""
                  strokeWidth="2"
                  fill="none"
                  opacity="0.4"
                />
                <g>
                  <line
                    x1="49"
                    y1="105"
                    x2="61"
                    y2="105"
                    stroke="#1f2937"
                    className=""
                    strokeWidth="2"
                    opacity="0.5"
                  />
                  <line
                    x1="55"
                    y1="99"
                    x2="55"
                    y2="111"
                    stroke="#1f2937"
                    className=""
                    strokeWidth="2"
                    opacity="0.5"
                  />
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 55 105"
                    to="360 55 105"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </g>
              </g>

              {/* Right wheel - detailed */}
              <g>
                <circle
                  cx="113"
                  cy="105"
                  r="11"
                  stroke="#1f2937"
                  className=""
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="113"
                  cy="105"
                  r="6"
                  stroke="#1f2937"
                  className=""
                  strokeWidth="2"
                  fill="none"
                  opacity="0.4"
                />
                <g>
                  <line
                    x1="107"
                    y1="105"
                    x2="119"
                    y2="105"
                    stroke="#1f2937"
                    className=""
                    strokeWidth="2"
                    opacity="0.5"
                  />
                  <line
                    x1="113"
                    y1="99"
                    x2="113"
                    y2="111"
                    stroke="#1f2937"
                    className=""
                    strokeWidth="2"
                    opacity="0.5"
                  />
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 113 105"
                    to="360 113 105"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </g>
              </g>

              {/* Subtle cart shadow */}
              <ellipse
                cx="84"
                cy="115"
                rx="45"
                ry="4"
                fill="#000000"
                opacity="0.08"
                className="dark:opacity-20"
              />
            </g>

            {/* Product 1 - Smartphone with better fall animation */}
            <g opacity="0">
              <rect
                x="75"
                y="-60"
                width="18"
                height="30"
                rx="3"
                stroke="#1f2937"
                className="dark:stroke-gray-300"
                strokeWidth="2.5"
                fill="white"
              />
              <rect
                x="78"
                y="-56"
                width="12"
                height="22"
                rx="1"
                fill="#e5e7eb"
                className="dark:fill-gray-700"
                opacity="0.5"
              />
              <circle
                cx="84"
                cy="-33"
                r="1.5"
                fill="#1f2937"
                className="dark:fill-gray-400"
              />
              <animate
                attributeName="opacity"
                values="0;1;1;1;1;1;0"
                keyTimes="0;0.15;0.4;0.65;0.75;0.85;1"
                dur="1s"
                repeatCount="indefinite"
                begin="0s"
              />
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0 0; 0 20; 0 50; 0 85; 0 95; 0 95"
                keyTimes="0;0.3;0.55;0.7;0.75;1"
                dur="1s"
                repeatCount="indefinite"
                begin="0s"
              />
              <animateTransform
                attributeName="transform"
                type="scale"
                values="0.7;0.9;1;1.15;1;1;1"
                keyTimes="0;0.3;0.6;0.71;0.76;0.8;1"
                dur="1s"
                repeatCount="indefinite"
                begin="0s"
                additive="sum"
              />
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 84 -45; -5 84 -45; 0 84 -45; 3 84 -45; 0 84 -45"
                keyTimes="0;0.3;0.5;0.72;1"
                dur="1s"
                repeatCount="indefinite"
                begin="0s"
                additive="sum"
              />
            </g>

            {/* Product 2 - Smartwatch */}
            <g opacity="0">
              <circle
                cx="50"
                cy="-55"
                r="10"
                stroke="#1f2937"
                className="dark:stroke-gray-300"
                strokeWidth="2.5"
                fill="white"
              />
              <circle
                cx="50"
                cy="-55"
                r="7"
                stroke="#1f2937"
                className="dark:stroke-gray-300"
                strokeWidth="1.5"
                fill="none"
                opacity="0.3"
              />
              <rect
                x="48"
                y="-67"
                width="4"
                height="5"
                rx="1"
                fill="#1f2937"
                className="dark:fill-gray-400"
                opacity="0.6"
              />
              <rect
                x="48"
                y="-48"
                width="4"
                height="5"
                rx="1"
                fill="#1f2937"
                className="dark:fill-gray-400"
                opacity="0.6"
              />
              <animate
                attributeName="opacity"
                values="0;1;1;1;1;1;0"
                keyTimes="0;0.15;0.4;0.65;0.75;0.85;1"
                dur="1s"
                repeatCount="indefinite"
                begin="0.5s"
              />
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0 0; 0 20; 0 50; 0 85; 0 95; 0 95"
                keyTimes="0;0.3;0.55;0.7;0.75;1"
                dur="1s"
                repeatCount="indefinite"
                begin="0.5s"
              />
              <animateTransform
                attributeName="transform"
                type="scale"
                values="0.7;0.9;1;1.15;1;1;1"
                keyTimes="0;0.3;0.6;0.71;0.76;0.8;1"
                dur="1s"
                repeatCount="indefinite"
                begin="0.5s"
                additive="sum"
              />
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 50 -55; 5 50 -55; 0 50 -55; -3 50 -55; 0 50 -55"
                keyTimes="0;0.3;0.5;0.72;1"
                dur="1s"
                repeatCount="indefinite"
                begin="0.5s"
                additive="sum"
              />
            </g>

            {/* Product 3 - Headphones */}
            <g opacity="0">
              <path
                d="M 100 -58 Q 110 -68, 120 -58"
                stroke="#1f2937"
                className="dark:stroke-gray-300"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              <rect
                x="97"
                y="-60"
                width="6"
                height="8"
                rx="2"
                fill="#1f2937"
                className="dark:fill-gray-300"
              />
              <rect
                x="117"
                y="-60"
                width="6"
                height="8"
                rx="2"
                fill="#1f2937"
                className="dark:fill-gray-300"
              />
              <animate
                attributeName="opacity"
                values="0;1;1;1;1;1;0"
                keyTimes="0;0.15;0.4;0.65;0.75;0.85;1"
                dur="1s"
                repeatCount="indefinite"
                begin="1s"
              />
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0 0; 0 20; 0 50; 0 85; 0 95; 0 95"
                keyTimes="0;0.3;0.55;0.7;0.75;1"
                dur="1s"
                repeatCount="indefinite"
                begin="1s"
              />
              <animateTransform
                attributeName="transform"
                type="scale"
                values="0.7;0.9;1;1.15;1;1;1"
                keyTimes="0;0.3;0.6;0.71;0.76;0.8;1"
                dur="1s"
                repeatCount="indefinite"
                begin="1s"
                additive="sum"
              />
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 110 -58; -8 110 -58; 0 110 -58; 5 110 -58; 0 110 -58"
                keyTimes="0;0.3;0.5;0.72;1"
                dur="1s"
                repeatCount="indefinite"
                begin="1s"
                additive="sum"
              />
            </g>

            {/* Product 4 - Book/Tablet */}
            <g opacity="0">
              <rect
                x="60"
                y="-62"
                width="16"
                height="22"
                rx="2"
                stroke="#1f2937"
                className="dark:stroke-gray-300"
                strokeWidth="2.5"
                fill="white"
              />
              <line
                x1="68"
                y1="-62"
                x2="68"
                y2="-40"
                stroke="#1f2937"
                className="dark:stroke-gray-300"
                strokeWidth="1.5"
                opacity="0.3"
              />
              <line
                x1="63"
                y1="-56"
                x2="73"
                y2="-56"
                stroke="#1f2937"
                className="dark:stroke-gray-300"
                strokeWidth="1"
                opacity="0.2"
              />
              <line
                x1="63"
                y1="-51"
                x2="73"
                y2="-51"
                stroke="#1f2937"
                className="dark:stroke-gray-300"
                strokeWidth="1"
                opacity="0.2"
              />
              <animate
                attributeName="opacity"
                values="0;1;1;1;1;1;0"
                keyTimes="0;0.15;0.4;0.65;0.75;0.85;1"
                dur="1s"
                repeatCount="indefinite"
                begin="1.5s"
              />
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0 0; 0 20; 0 50; 0 85; 0 95; 0 95"
                keyTimes="0;0.3;0.55;0.7;0.75;1"
                dur="1s"
                repeatCount="indefinite"
                begin="1.5s"
              />
              <animateTransform
                attributeName="transform"
                type="scale"
                values="0.7;0.9;1;1.15;1;1;1"
                keyTimes="0;0.3;0.6;0.71;0.76;0.8;1"
                dur="1s"
                repeatCount="indefinite"
                begin="1.5s"
                additive="sum"
              />
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 68 -51; 6 68 -51; 0 68 -51; -4 68 -51; 0 68 -51"
                keyTimes="0;0.3;0.5;0.72;1"
                dur="1s"
                repeatCount="indefinite"
                begin="1.5s"
                additive="sum"
              />
            </g>

            {/* Product 5 - Package/Box */}
            <g opacity="0">
              <rect
                x="100"
                y="-62"
                width="20"
                height="20"
                rx="2"
                stroke="#1f2937"
                className="dark:stroke-gray-300"
                strokeWidth="2.5"
                fill="white"
              />
              <line
                x1="100"
                y1="-52"
                x2="120"
                y2="-52"
                stroke="#1f2937"
                className="dark:stroke-gray-300"
                strokeWidth="2"
                opacity="0.3"
              />
              <line
                x1="110"
                y1="-62"
                x2="110"
                y2="-42"
                stroke="#1f2937"
                className="dark:stroke-gray-300"
                strokeWidth="2"
                opacity="0.3"
              />
              <animate
                attributeName="opacity"
                values="0;1;1;1;1;1;0"
                keyTimes="0;0.15;0.4;0.65;0.75;0.85;1"
                dur="1s"
                repeatCount="indefinite"
                begin="2s"
              />
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0 0; 0 20; 0 50; 0 85; 0 95; 0 95"
                keyTimes="0;0.3;0.55;0.7;0.75;1"
                dur="1s"
                repeatCount="indefinite"
                begin="2s"
              />
              <animateTransform
                attributeName="transform"
                type="scale"
                values="0.7;0.9;1;1.15;1;1;1"
                keyTimes="0;0.3;0.6;0.71;0.76;0.8;1"
                dur="1s"
                repeatCount="indefinite"
                begin="1s"
                additive="sum"
              />
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 110 -52; -7 110 -52; 0 110 -52; 4 110 -52; 0 110 -52"
                keyTimes="0;0.3;0.5;0.72;1"
                dur="1s"
                repeatCount="indefinite"
                begin="2s"
                additive="sum"
              />
            </g>

            {/* Impact burst effect when items land */}
            {[0, 0.5, 1, 1.3, 1.8].map((delay) => (
              <g key={delay} opacity="0">
                <circle
                  cx="84"
                  cy="60"
                  r="0"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                />
                <animate
                  attributeName="opacity"
                  values="0;0;0.8;0"
                  keyTimes="0;0.7;0.75;1"
                  dur="1s"
                  repeatCount="indefinite"
                  begin={`${delay}s`}
                />
                <animate
                  attributeName="r"
                  values="0;0;8;25"
                  keyTimes="0;0.7;0.75;1"
                  dur="1s"
                  repeatCount="indefinite"
                  begin={`${delay}s`}
                />
                <animate
                  attributeName="stroke-width"
                  values="2.5;2.5;2.5;0"
                  keyTimes="0;0.7;0.75;1"
                  dur="1s"
                  repeatCount="indefinite"
                  begin={`${delay}s`}
                />
              </g>
            ))}
          </g>
        </svg>
      </div>
      <style>
        {`
          @keyframes moveLeft {
  from { transform: translateX(100vw); }
  to { transform: translateX(-300px); }
}

        `}
      </style>
    </div>
  );
};

export default ContactLoader;
