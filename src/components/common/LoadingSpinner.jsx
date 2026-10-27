export default function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizeMap = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className={`${sizeMap[size] || sizeMap.md} border-violet-600 border-t-transparent rounded-full animate-spin mb-3`} />
      {text && <p className="text-sm font-medium text-slate-500">{text}</p>}
    </div>
  );
}
