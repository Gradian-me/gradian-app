'use client';

import React from 'react';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { CheckCircle2 } from 'lucide-react';
import {
  TicketCardWrapper,
  TicketCardHeader,
  TicketCardContent,
  TicketCardBadge,
  TicketCardFooter,
} from '@/gradian-ui/data-display/ticket-card';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';

export default function TicketCardPage() {
  useSetLayoutProps({
    title: 'Ticket Card',
    subtitle:
      'Composable ticket-style card with header, content, badge, and footer supporting QR, barcode, and DataMatrix.',
    icon: 'Ticket',
  });

  // Fixed date for "Date & Time" so server and client render the same (avoids hydration mismatch).
  const demoDate = new Date('2026-03-09T08:40:00');
  const paymentItems = [
    { label: 'Ticket ID', value: 'TKT-8F2A-91' },
    {
      label: 'Amount',
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(49.99),
    },
    {
      label: 'Date & Time',
      value: new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(demoDate).replace(',', ' •'),
    },
    { label: 'Card', value: '•••• 4242' },
  ];

  const gs1StyleItems = [
    { label: 'AI (01)', value: '05012345678901' },
    { label: 'Batch', value: 'BATCH-2024-001' },
    { label: 'Expiry', value: '2025-12-31' },
    { label: 'Serial', value: 'SN-987654' },
  ];

  const paymentTicketPropsCode = `<TicketCardWrapper
  showCutouts={true}
  cutoutClassName="bg-white dark:bg-gray-800"
>
  <TicketCardHeader
    icon={<CheckCircle2 className="w-10 h-10 text-primary" />}
    iconColor="bg-primary/10 text-primary"
    title="Thank you!"
    description="Your ticket has been issued successfully"
  />
  <TicketCardContent items={paymentItems} />
  <TicketCardFooter
    barcodeValue="TKT-8F2A-91"
    barcodeType="barcode"
    footerDescription="Code 128"
  />
</TicketCardWrapper>`;

  const gs1TicketPropsCode = `<TicketCardWrapper
  showCutouts={true}
  orientation="landscape"
  cutoutClassName="bg-white dark:bg-gray-800"
>
  <TicketCardHeader
    icon={<CheckCircle2 className="w-10 h-10 text-emerald-600 ..." />}
    iconColor="bg-emerald-100 dark:bg-emerald-900/40 ..."
    title="Application Identifiers"
    description="GS1 parsed data"
  />
  <TicketCardBadge>
    <CheckCircle2 className="w-3.5 h-3.5" /> GS1
  </TicketCardBadge>
  <TicketCardContent items={gs1StyleItems} />
  <TicketCardFooter
    barcodeValue="]C101040123456789011726072910ABC123\\\\F39329784711\\\\F310300052539224711\\\\F42127649716"
    barcodeType="datamatrix"
    footerDescription="GS1 DataMatrix"
  />
</TicketCardWrapper>`;

  const qrTicketPropsCode = `<TicketCardWrapper showCutouts={false}>
  <TicketCardHeader
    icon={<CheckCircle2 className="w-10 h-10 text-primary" />}
    title="Scan to verify"
    description="QR code contains ticket reference"
  />
  <TicketCardContent items={[{ label: 'Reference', value: 'REF-QR-12345' }]} />
  <TicketCardFooter
    barcodeValue="https://example.com/ticket/REF-QR-12345"
    barcodeType="qr"
    footerDescription="Scan with any QR reader"
  />
</TicketCardWrapper>`;

  return (
    <div className="space-y-8">
      {/* Payment-style ticket */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Payment-style ticket
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Thank-you style ticket with barcode footer.
          </p>
        </div>
        <div className="flex justify-center">
          <TicketCardWrapper
            showCutouts={true}
            showPrintButton
            cutoutClassName="bg-white dark:bg-gray-800"
          >
            <TicketCardHeader
              icon={<CheckCircle2 className="w-10 h-10 text-primary" />}
              iconColor="bg-primary/10 text-primary"
              title="Thank you!"
              description="Your ticket has been issued successfully"
            />
            <TicketCardContent items={paymentItems} />
            <TicketCardFooter
              barcodeValue="TKT-8F2A-91"
              barcodeType="barcode"
              footerDescription="Code 128"
            />
          </TicketCardWrapper>
        </div>
        <CodeViewer
          code={paymentTicketPropsCode}
          programmingLanguage="tsx"
          title="Props passed (Payment ticket)"
        />
      </section>

      {/* GS1-style ticket (landscape) */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            GS1-style ticket (landscape)
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Application identifiers style with badge and DataMatrix. Wide layout for GS1 data.
          </p>
        </div>
        <div className="flex justify-center">
          <TicketCardWrapper
            showCutouts={true}
            showPrintButton
            orientation="landscape"
            cutoutClassName="bg-white dark:bg-gray-800"
          >
            <TicketCardHeader
              icon={<CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />}
              iconColor="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
              title="Application Identifiers"
              description="GS1 parsed data"
            />
            <div className="flex justify-center pb-2">
              <TicketCardBadge>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                GS1
              </TicketCardBadge>
            </div>
            <TicketCardContent items={gs1StyleItems} />
            <TicketCardFooter
              barcodeValue={']C101040123456789011726072910ABC123\\F39329784711\\F310300052539224711\\F42127649716'}
              barcodeType="datamatrix"
              footerDescription="GS1 DataMatrix"
            />
          </TicketCardWrapper>
        </div>
        <CodeViewer
          code={gs1TicketPropsCode}
          programmingLanguage="tsx"
          title="Props passed (GS1-style ticket)"
        />
      </section>

      {/* QR code ticket */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            QR code ticket
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ticket with QR code in the footer.
          </p>
        </div>
        <div className="flex justify-center">
          <TicketCardWrapper showCutouts={false} showPrintButton>
            <TicketCardHeader
              icon={<CheckCircle2 className="w-10 h-10 text-primary" />}
              title="Scan to verify"
              description="QR code contains ticket reference"
            />
            <TicketCardContent
              items={[{ label: 'Reference', value: 'REF-QR-12345' }]}
            />
            <TicketCardFooter
              barcodeValue="https://example.com/ticket/REF-QR-12345"
              barcodeType="qr"
              footerDescription="Scan with any QR reader"
            />
          </TicketCardWrapper>
        </div>
        <CodeViewer
          code={qrTicketPropsCode}
          programmingLanguage="tsx"
          title="Props passed (QR ticket)"
        />
      </section>
    </div>
  );
}
