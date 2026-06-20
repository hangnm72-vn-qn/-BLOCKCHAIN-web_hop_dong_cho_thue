function Button({ children, onClick, type = 'button', variant = 'primary', className = '' }) {
  const baseStyle = "font-medium px-5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer text-sm text-center tracking-wide focus:outline-none";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 active:scale-98",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-98",
    danger: "bg-rose-600 hover:bg-rose-500 text-white active:scale-98"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export default Button;