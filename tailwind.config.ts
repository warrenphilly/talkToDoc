import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(210, 10%, 15%)',
  			foreground: 'hsl(210, 10%, 90%)',
  			card: {
  				DEFAULT: 'hsl(210, 10%, 20%)',
  				foreground: 'hsl(210, 10%, 80%)'
  			},
  			popover: {
  				DEFAULT: 'hsl(210, 10%, 25%)',
  				foreground: 'hsl(210, 10%, 75%)'
  			},
  			primary: {
  				DEFAULT: 'hsl(210, 10%, 30%)',
  				foreground: 'hsl(210, 10%, 70%)'
  			},
  			secondary: {
  				DEFAULT: 'hsl(210, 10%, 35%)',
  				foreground: 'hsl(210, 10%, 65%)'
  			},
  			muted: {
  				DEFAULT: 'hsl(210, 10%, 40%)',
  				foreground: 'hsl(210, 10%, 60%)'
  			},
  			accent: {
  				DEFAULT: 'hsl(210, 10%, 45%)',
  				foreground: 'hsl(210, 10%, 55%)'
  			},
  			destructive: {
  				DEFAULT: 'hsl(0, 70%, 50%)',
  				foreground: 'hsl(0, 70%, 90%)'
  			},
  			
  			input: 'hsl(210, 10%, 55%)',
  			ring: 'hsl(210, 10%, 60%)',
  			chart: {
  				'1': 'hsl(210, 10%, 65%)',
  				'2': 'hsl(210, 10%, 70%)',
  				'3': 'hsl(210, 10%, 75%)',
  				'4': 'hsl(210, 10%, 80%)',
  				'5': 'hsl(210, 10%, 85%)'
  			},navy: {
				'navy-200': 'hsl(220, 50%, 90%)',
				'navy-300': 'hsl(220, 50%, 80%)',
				'navy-400': 'hsl(220, 50%, 70%)',
				'navy-500': 'hsl(220, 50%, 60%)',
				'navy-600': 'hsl(220, 50%, 50%)',
				'navy-700': 'hsl(220, 50%, 40%)',
				'navy-800': 'hsl(220, 50%, 30%)',
				'navy-900': 'hsl(220, 50%, 20%)'
			},
  			darkNavy: {
  				'100': 'hsl(220, 60%, 95%)',
  				'200': 'hsl(220, 60%, 85%)',
  				'300': 'hsl(220, 60%, 75%)',
  				'400': 'hsl(220, 60%, 65%)',
  				'500': 'hsl(220, 60%, 55%)',
  				'600': 'hsl(220, 60%, 45%)',
  				'700': 'hsl(220, 60%, 35%)',
  				'800': 'hsl(220, 60%, 25%)',
  				'900': 'hsl(220, 60%, 15%)'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(210, 10%, 20%)',
  				foreground: 'hsl(210, 10%, 80%)',
  				primary: 'hsl(210, 10%, 30%)',
  				'primary-foreground': 'hsl(210, 10%, 70%)',
  				accent: 'hsl(210, 10%, 45%)',
  				'accent-foreground': 'hsl(210, 10%, 55%)',
  				border: 'hsl(210, 10%, 50%)',
  				ring: 'hsl(210, 10%, 60%)'
  			}
			
		  },
		  transitionDelay: {
			'2000': '2000ms',
		  },
		  
  
  	}
  },
  plugins: [require("tailwindcss-animate"),require("tailwindcss-animation-delay")],
} satisfies Config;
