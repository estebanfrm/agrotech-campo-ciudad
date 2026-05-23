/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#164A2F",
        leaf: "#64A46C",
        mint: "#DDEEDB",
        wheat: "#F3EBD8",
        stoneSoft: "#F5F6F3",
        ink: "#243126",
      },
      boxShadow: {
        soft: "0 18px 45px rgba(22, 74, 47, 0.10)",
      },
    },
  },
  plugins: [],
};
