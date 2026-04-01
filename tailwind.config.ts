import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cores Abächerly
        abacherly: {
          primary: '#2c4a70',      // Destaques e títulos
          secondary: '#4674e8',    // Apoio secundário
          dark: '#1a2b45',         // Textos para fundo claro
          light: '#ffffff',        // Textos para fundo escuro
          accent: '#d64b16',       // Linhas sutis e divisões
        },
        // Aliases para facilitar uso
        primary: '#2c4a70',
        secondary: '#4674e8',
        accent: '#d64b16',
      },
      fontFamily: {
        serif: ['Libertinus Serif', 'Georgia', 'Times New Roman', 'serif'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(44, 74, 112, 0.1), 0 2px 4px -1px rgba(44, 74, 112, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(44, 74, 112, 0.1), 0 4px 6px -2px rgba(44, 74, 112, 0.05)',
      },
      borderColor: {
        DEFAULT: '#d64b16',
      },
    },
  },
  plugins: [],
}

export default config
