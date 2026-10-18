import type { Metadata } from 'next';
import { Container, Card, PageHeader, Breadcrumb, BrandFooter } from '@/components/ui';
import ContactForm from './ContactForm';

export const metadata: Metadata = {
  title: 'Contact | HackathonOS',
  description:
    'Get in touch with the HackathonOS team — questions, feedback, or help running your hackathon. Built by AKCLNT.',
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Container className="py-10 sm:py-14">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Contact' }]} />
        <PageHeader
          title="Contact us"
          subtitle="Questions, feedback, or need help running your hackathon? Send us a message — we read every one."
        />

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <Card className="p-6 sm:p-8">
            <ContactForm />
          </Card>

          <aside className="space-y-6">
            <Card className="p-6">
              <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
                Direct email
              </p>
              <a
                href="mailto:info@akclnt.com"
                className="mt-2 block break-all text-lg font-bold text-indigo-600 transition hover:text-indigo-800 hover:underline"
              >
                info@akclnt.com
              </a>
              <p className="mt-2 text-sm text-slate-500">
                Prefer email? Write to us directly — it lands in the same inbox.
              </p>
            </Card>

            <Card className="border-indigo-100 bg-indigo-50/60 p-6">
              <p className="font-bold text-slate-900">Organizer?</p>
              <p className="mt-2 text-sm text-slate-600">
                If you&rsquo;re already signed in, you can also manage events, judging, and
                check-ins right from your{' '}
                <a href="/dashboard" className="font-semibold text-indigo-600 hover:underline">
                  dashboard
                </a>
                .
              </p>
            </Card>
          </aside>
        </div>
      </Container>
      <BrandFooter />
    </main>
  );
}
