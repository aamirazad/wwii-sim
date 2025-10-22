import Link from "next/link";

export function InlineLink({
	children,
	href,
	className,
	rel,
	target,
}: {
	children: React.ReactNode;
	href: string;
	className?: string;
	rel?: string;
	target?: string;
}) {
	return (
		<Link
			className={
				"underline underline-offset-5 hover:opacity-80" +
				(className ? ` ${className}` : "")
			}
			href={href}
			rel={rel}
			target={target}
		>
			{children}
		</Link>
	);
}
