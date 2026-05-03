import { GroupsEditPage } from '@/views/groups-edit/ui/groups-edit-page';

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  return <GroupsEditPage groupCode={code} />;
}
