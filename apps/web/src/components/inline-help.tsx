import { CircleHelp } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export function InlineHelp({ text }: { text: string }) {
	return (
		<Tooltip>
			<TooltipTrigger
				className="inline-flex cursor-help text-muted-foreground"
				aria-label="Field help"
			>
				<CircleHelp className="size-3.5" />
				<span className="sr-only">Help</span>
			</TooltipTrigger>
			<TooltipContent className="max-w-72 leading-5">{text}</TooltipContent>
		</Tooltip>
	);
}
