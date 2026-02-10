import Background from "@/components/background";
import ManageUsers from "@/components/manage-users";

export default function AdminUsersPage() {
	return (
		<Background static={true}>
			<div className="container mx-auto p-8 z-10">
				<ManageUsers fullPage={true} />
			</div>
		</Background>
	);
}
