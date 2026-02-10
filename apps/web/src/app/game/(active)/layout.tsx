import { AnnouncementToastListener } from "@/components/announcement-toast";
import Background from "@/components/background";
import { NewYearDialog } from "@/components/new-year-dialog";
import { Toaster } from "@/components/ui/sonner";

export default function ActiveGameLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<Background static>
			{children}
			<NewYearDialog />
			<Toaster position="bottom-right" expand richColors />
			<AnnouncementToastListener />
		</Background>
	);
}
