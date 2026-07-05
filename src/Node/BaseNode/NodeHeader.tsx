interface NodeHeaderProps {
    title: string;
    className?: string;
}

export default function NodeHeader({ title, className = "" }: NodeHeaderProps) {
    return (
        <div className={`text-white text-sm font-semibold px-3 py-1.5 flex justify-between items-center rounded-t-xl ${className}`}>
            <span>{title}</span>
        </div>
    );
}
