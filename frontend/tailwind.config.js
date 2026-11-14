/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Big monitors (27"+): the page widens and grids add columns here.
      // Named wide/ultra (not 3xl/4xl): auth pages already carry inert 3xl:
      // classes that were never wired up, and shouldn't change silently.
      screens: { wide: "1920px", ultra: "2400px" },
      textColor: ["selection"],
      fontFamily: {
        figtree: ["Figtree", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      listStyleType: {
        alpha: "lower-alpha",
      },
    },
  },
  plugins: [],
};
