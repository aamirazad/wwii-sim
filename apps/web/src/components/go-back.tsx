"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export default function GoBack({ onClick }: { onClick?: () => void }) {
	const router = useRouter();

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						className="mr-2 cursor-pointer"
						onClick={onClick ?? (() => router.back())}
						size="icon"
					>
						<ArrowLeft />
					</Button>
				}
			/>
			<TooltipContent>Go Back</TooltipContent>
		</Tooltip>
	);
}
