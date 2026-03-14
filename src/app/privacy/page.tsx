'use client';

import { useRouter } from 'next/navigation';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-royal-bg text-white px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-1 text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">Privacy Policy</h1>
      </div>

      <div className="max-w-2xl mx-auto space-y-6 text-sm leading-relaxed">
        <div>
          <p className="text-white/40 text-xs">Effective Date: March 13, 2026</p>
          <p className="text-white/40 text-xs">Last Updated: March 13, 2026</p>
        </div>

        <section>
          <h2 className="text-gold font-semibold text-base mb-2">1. Introduction</h2>
          <p className="text-white/80">
            Stitch Manager (&quot;the App&quot;) is owned by TECKMAKE Access Solution Ltd and operated by CLEMENT GOOD-DAY INFORMATION AND COMMUNICATION TECHNOLOGY LIMITED (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). We are committed to protecting your privacy while providing tools to manage your tailoring or fashion design business.
          </p>
        </section>

        <section>
          <h2 className="text-gold font-semibold text-base mb-2">2. Information We Collect (Server-Side)</h2>
          <p className="text-white/80 mb-2">To provide account services, we collect and store the following on our secure servers:</p>
          <ul className="list-disc list-inside text-white/70 space-y-1 ml-2">
            <li><strong className="text-white/90">Registration Information:</strong> Your name, business name, and email address (support@stitchmanager.online).</li>
            <li><strong className="text-white/90">Authentication Data:</strong> Encrypted credentials used to secure your account access.</li>
            <li><strong className="text-white/90">Subscription Data:</strong> Information regarding your service plan or account status.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-gold font-semibold text-base mb-2">3. Local Data Sovereignty (On-Device Storage)</h2>
          <p className="text-white/80 mb-2">
            We respect the sensitivity of your professional records. We do not host or store your clients&apos; personal details, measurements, or private business records on our company servers. The following data is stored locally on your mobile device:
          </p>
          <ul className="list-disc list-inside text-white/70 space-y-1 ml-2">
            <li><strong className="text-white/90">Client Database:</strong> Names, contact information, and body measurements.</li>
            <li><strong className="text-white/90">Project Assets:</strong> Style inspirations, fabric photos, and order history.</li>
            <li><strong className="text-white/90">Personal Notes:</strong> Specific tailoring instructions.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-gold font-semibold text-base mb-2">4. Data Backup and Third-Party Transfers</h2>
          <p className="text-white/80 mb-2">The App provides features to help you protect your data:</p>
          <ul className="list-disc list-inside text-white/70 space-y-1 ml-2">
            <li><strong className="text-white/90">Google Drive Backup:</strong> The App allows you to sync your local database to your personal Google Drive account. This is a user-initiated transfer. We do not have access to your Google Drive or the files stored within it.</li>
            <li><strong className="text-white/90">Manual Export:</strong> You may export your data locally for your own records.</li>
            <li><strong className="text-white/90">Third-Party Services:</strong> Use of Google Drive is subject to Google&apos;s own Privacy Policy and Terms of Service.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-gold font-semibold text-base mb-2">5. App Permissions</h2>
          <p className="text-white/80 mb-2">To function correctly, the App requires the following permissions:</p>
          <ul className="list-disc list-inside text-white/70 space-y-1 ml-2">
            <li><strong className="text-white/90">Storage/Media:</strong> To save and view garment photos and local backups.</li>
            <li><strong className="text-white/90">Camera:</strong> To capture images of fabrics or style inspirations for your client records.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-gold font-semibold text-base mb-2">6. Data Retention and Deletion</h2>
          <ul className="list-disc list-inside text-white/70 space-y-1 ml-2">
            <li><strong className="text-white/90">Registration Data:</strong> We retain your account information as long as your account is active. You may request account deletion by emailing support@stitchmanager.online.</li>
            <li><strong className="text-white/90">Local Data:</strong> Since client data is stored on your device, deleting the App will permanently erase that data unless you have performed a backup.</li>
            <li><strong className="text-white/90">Google Play Requirements:</strong> We provide a dedicated web-based path for users to request account and data deletion at <a href="/delete-account" className="text-gold underline">app.stitchmanager.online/delete-account</a> in accordance with Google Play&apos;s 2026 policies.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-gold font-semibold text-base mb-2">7. Data Security</h2>
          <p className="text-white/80">
            We implement industry-standard encryption for data in transit (SSL/TLS) between the App and our servers. You are responsible for maintaining the physical security of your device and your Google Account to protect your local and cloud backups.
          </p>
        </section>

        <section>
          <h2 className="text-gold font-semibold text-base mb-2">8. International Transfers</h2>
          <p className="text-white/80">
            Your registration data may be processed on servers located outside of your home country. By using the App, you consent to this transfer, provided the data is handled with equivalent security standards.
          </p>
        </section>

        <section>
          <h2 className="text-gold font-semibold text-base mb-2">9. Changes to This Policy</h2>
          <p className="text-white/80">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last Updated&quot; date.
          </p>
        </section>

        <section>
          <h2 className="text-gold font-semibold text-base mb-2">10. Contact Us</h2>
          <p className="text-white/80">For any questions regarding this Privacy Policy or your data, please contact:</p>
          <div className="text-white/70 mt-2 space-y-1 ml-2">
            <p><strong className="text-white/90">Owner:</strong> TECKMAKE Access Solution Ltd</p>
            <p><strong className="text-white/90">Operator:</strong> CLEMENT GOOD-DAY INFORMATION AND COMMUNICATION TECHNOLOGY LIMITED</p>
            <p><strong className="text-white/90">Email:</strong> support@stitchmanager.online</p>
            <p><strong className="text-white/90">Official Website:</strong> https://stitchmanager.online</p>
          </div>
        </section>
      </div>
    </div>
  );
}
