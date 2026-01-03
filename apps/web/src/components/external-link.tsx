import { ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ExternalLink({
	children,
	href,
	className,
}: Readonly<{
	children: React.ReactNode;
	href: string;
	className?: string;
}>) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className={cn(
				"inline-flex items-center gap-1 font-medium underline underline-offset-4 transition-colors hover:text-muted-foreground",
				className,
			)}
		>
			{children}
			<ExternalLinkIcon className="size-4" />
		</a>
	);
}
