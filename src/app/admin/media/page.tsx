import { redirect } from 'next/navigation';

// The standalone media library was removed — image uploads happen inline in
// each entity form (ImageUploader) and in the rich text editor. This route
// now redirects to the dashboard. Feel free to `git rm` the whole media
// folder when convenient.
export default function MediaRemovedPage() {
  redirect('/admin/dashboard');
}
