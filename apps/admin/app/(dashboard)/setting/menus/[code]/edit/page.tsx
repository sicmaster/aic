import { MenusEditPage } from '@/views/menus-edit/ui/menus-edit-page';

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  return <MenusEditPage menuCode={code} />;
}
