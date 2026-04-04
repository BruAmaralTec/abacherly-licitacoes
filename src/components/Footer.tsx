export default function Footer() {
  return (
    <footer className="w-full py-3 lg:py-4 px-4 lg:px-6 border-t border-[#d64b16]/20 bg-white/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-center">
        <p className="text-xs lg:text-sm text-[#1a2b45]/60 font-serif text-center">
          Fluxo Agêntico de IA produzido por{' '}
          <a 
            href="https://en1.com.br" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#4674e8] hover:text-[#2c4a70] font-bold transition-colors"
          >
            EN1 Soluções em IA
          </a>
          <span className="hidden sm:inline">
            {' - '}
            <span className="text-[#2c4a70]">en1.com.br</span>
          </span>
        </p>
      </div>
    </footer>
  );
}
