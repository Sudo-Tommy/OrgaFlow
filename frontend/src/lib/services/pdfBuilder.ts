import { pb } from '$lib/services/pocketbase';
import { toastService } from '$lib/services/toast.d.svelte';

export interface PDFBuilderOptions {
	docMeta: any;
	blocks: any[];
	selectedTemplate: string;
	companyData: any;
	selectedClientData: any;
	currentUser: any;
	selectedTimeRecords: string[];
	createAccountingRecord: boolean;
	existingDoc: any;
	onSuccess: () => void;
	onError: () => void;
}

async function fetchImageBuffer(url: string | null) {
	if (!url) return null;
	try {
		const res = await fetch(url);
		if (!res.ok) return null;
		return await res.arrayBuffer();
	} catch(e) { return null; }
}

export async function buildAndSavePDF(options: PDFBuilderOptions) {
	const { 
		docMeta, blocks, selectedTemplate, companyData, selectedClientData, 
		currentUser, selectedTimeRecords, createAccountingRecord, existingDoc, 
		onSuccess, onError 
	} = options;

	try {
		const PDFDoc = (window as any).PDFDocument;
		if (!PDFDoc) throw new Error('PDF-Engine fehlt.');

		const doc = new PDFDoc({ margin: 50, size: 'A4', layout: docMeta.orientation });
		const chunks: any[] = [];
		doc.on('data', (chunk: any) => chunks.push(chunk));

		// Bilder laden
		const userSignUrl = currentUser?.sign ? pb.files.getURL(currentUser, currentUser.sign) : null;
		const clientSignUrl = selectedClientData?.sign ? pb.files.getURL(selectedClientData, selectedClientData.sign) : null;
		const companyLogoUrl = companyData?.logo ? pb.files.getURL(companyData, companyData.logo) : null;

		const userSignBuffer = await fetchImageBuffer(userSignUrl);
		const clientSignBuffer = await fetchImageBuffer(clientSignUrl);
		const logoBuffer = await fetchImageBuffer(companyLogoUrl);

		doc.on('end', async () => {
			try {
				const pdfBlob = new Blob(chunks, { type: 'application/pdf' });
				
				let fileName = `${docMeta.document_type}_${Date.now()}.pdf`;
				if (docMeta.document_type === 'Rechnung') {
					const year = new Date(docMeta.issue_date).getFullYear();
					const cName = selectedClientData ? selectedClientData.name_last.replace(/[^a-zA-Z0-9]/g, '') : 'Unbekannt';
					fileName = `RE${docMeta.invoice_nr.replace(/[^a-zA-Z0-9]/g, '')}-${year}-${cName}.pdf`;
				}
				
				const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

				const formData = new FormData();
				formData.append('title', docMeta.title);
				formData.append('invoice_nr', docMeta.invoice_nr);
				formData.append('document_type', JSON.stringify({ 
					type: docMeta.document_type, orientation: docMeta.orientation,
					taxRate: docMeta.taxRate, template: selectedTemplate,
					billing_period: docMeta.billing_period, blocks: blocks 
				}));
				formData.append('status', docMeta.status);
				formData.append('issue_date', `${docMeta.issue_date} 12:00:00.000Z`);
				formData.append('due_date', `${docMeta.due_date} 12:00:00.000Z`);
				formData.append('amount', docMeta.amount.toString());
				formData.append('user', currentUser?.id || '');
				formData.append('is_signed', (!!(userSignBuffer && clientSignBuffer)).toString());
				if (docMeta.client) formData.append('client', docMeta.client);
				selectedTimeRecords.forEach(trId => formData.append('time_records', trId));
				formData.append('notes', docMeta.notes);
				formData.append('file', file); 

				let savedDocId = '';
				if (existingDoc) {
					const rec = await pb.collection('documents').update(existingDoc.id, formData);
					savedDocId = rec.id;
					toastService.success('Dokument aktualisiert!');
				} else {
					const rec = await pb.collection('documents').create(formData);
					savedDocId = rec.id;
					toastService.success('Dokument generiert!');
				}

				// Einnahmebuchung (Ninox Logik)
				if (createAccountingRecord && docMeta.document_type === 'Rechnung') {
					const net = docMeta.amount / (1 + (docMeta.taxRate / 100));
					await pb.collection('accounting').create({
						title: `Rechnung ${docMeta.invoice_nr} - ${selectedClientData?.name_last || 'Klient'}`,
						transaction_type: 'Einnahme',
						amount_net: net,
						tax_rate: docMeta.taxRate.toString(),
						amount_gross: docMeta.amount,
						transaction_date: `${docMeta.issue_date} 12:00:00.000Z`,
						category: 'Leistungserbringung',
						payment_method: 'Banküberweisung',
						status: 'Offen',
						related_document: savedDocId,
						createdby: currentUser?.id
					});
					toastService.success('Buchhaltungssatz erstellt.');
				}

				onSuccess();
			} catch (e) {
				console.error(e);
				toastService.error('Fehler beim Speichern in der Datenbank.');
				onError();
			}
		});

		// --- PDF LAYOUT ZEICHNEN ---
		let primaryColor = '#000000';
		if (selectedTemplate === 'modern') primaryColor = '#4f46e5';
		else if (selectedTemplate === 'elegant') primaryColor = '#0f172a';

		const pageWidth = docMeta.orientation === 'portrait' ? 595 : 842;
		const contentWidth = pageWidth - 100; // 50px Margin links/rechts

		blocks.forEach(block => {
			const align = block.align || 'left';

			if (block.type === 'header_company') {
				const startY = doc.y;
				
				// Logo Oben Rechts
				if (logoBuffer) {
					doc.image(logoBuffer, pageWidth - 50 - 140, startY, { fit: [140, 60], align: 'right' });
				}

				// Kleine Absenderzeile
				if (companyData) {
					doc.fontSize(8).fillColor(primaryColor).font('Helvetica')
					   .text(`${companyData.name} • ${companyData.street} ${companyData.housenr} • ${companyData.zip} ${companyData.city}`, 50, startY + 20, { width: contentWidth });
				}
				
				const clientStartY = startY + 40;
				let clientEndY = clientStartY;

				// Adresse Klient (Links)
				if (selectedClientData) {
					doc.fontSize(11).fillColor('#000000').font('Helvetica');
					if (selectedClientData.salutation && selectedClientData.salutation !== 'Keine Angabe') {
						doc.text(selectedClientData.salutation, 50, clientEndY);
						clientEndY = doc.y;
					}
					doc.text(`${selectedClientData.name_first} ${selectedClientData.name_last}`, 50, clientEndY);
					clientEndY = doc.y;
					doc.text(`${selectedClientData.street} ${selectedClientData.housenr}`, 50, clientEndY);
					clientEndY = doc.y;
					doc.text(`${selectedClientData.zip} ${selectedClientData.city}`, 50, clientEndY);
					clientEndY = doc.y;
				}

				// Firmen Info-Block (Rechts)
				let companyEndY = startY + 80;
				if (companyData) {
					doc.fontSize(10).fillColor('#4b5563').font('Helvetica');
					doc.text(companyData.name, pageWidth - 250, companyEndY, { width: 200, align: 'right' });
					companyEndY = doc.y;
					doc.text(`${companyData.street} ${companyData.housenr}`, pageWidth - 250, companyEndY, { width: 200, align: 'right' });
					companyEndY = doc.y;
					doc.text(`${companyData.zip} ${companyData.city}`, pageWidth - 250, companyEndY, { width: 200, align: 'right' });
					companyEndY = doc.y;
					doc.text(`Tel: ${companyData.phone || currentUser?.phone || ''}`, pageWidth - 250, companyEndY + 10, { width: 200, align: 'right' });
					companyEndY = doc.y;
					doc.text(`Mail: ${currentUser?.email || ''}`, pageWidth - 250, companyEndY, { width: 200, align: 'right' });
					companyEndY = doc.y;
					if (companyData.vatcode) {
						doc.text(`USt-IdNr.: ${companyData.vatcode}`, pageWidth - 250, companyEndY, { width: 200, align: 'right' });
						companyEndY = doc.y;
					}
				}
				
				// Nächster Block startet unter dem längsten Element
				doc.y = Math.max(clientEndY, companyEndY) + 30;
			} 
			
			else if (block.type === 'meta_table') {
				const metaY = doc.y;
				if (selectedTemplate !== 'minimal') {
					doc.moveTo(50, metaY).lineTo(pageWidth - 50, metaY).strokeColor('#e5e7eb').lineWidth(1).stroke();
				}
				
				const textY = metaY + 5;
				doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
				
				let txt = `Rechnungs-Nr.: ${block.content.ref || docMeta.invoice_nr}`;
				if (block.content.period) txt += `   |   Zeitraum: ${block.content.period}`;
				if (block.content.ik) txt += `   |   IK-Nummer: ${block.content.ik}`;
				
				doc.text(txt, 50, textY, { width: contentWidth - 120, align: 'left' });
				doc.text(`Datum: ${new Date(docMeta.issue_date).toLocaleDateString('de-DE')}`, pageWidth - 150, textY, { width: 100, align: 'right' });
				
				const bottomY = Math.max(doc.y, textY + 15);
				if (selectedTemplate !== 'minimal') {
					doc.moveTo(50, bottomY).lineTo(pageWidth - 50, bottomY).strokeColor('#e5e7eb').stroke();
				}
				doc.y = bottomY + 20;
			}

			else if (block.type === 'heading') {
				doc.fontSize(selectedTemplate === 'elegant' ? 24 : 20).fillColor(primaryColor).font('Helvetica-Bold');
				doc.text(block.content, 50, doc.y, { width: contentWidth, align });
				doc.y += 10;
			} 

			else if (block.type === 'paragraph') {
				doc.fontSize(11).fillColor('#000000').font('Helvetica');
				doc.text(block.content, 50, doc.y, { width: contentWidth, align });
				doc.y += 10;
			} 
			
			else if (block.type === 'legal_text') {
				doc.fontSize(8).fillColor('#6b7280').font('Helvetica-Oblique');
				doc.text(block.content, 50, doc.y, { width: contentWidth, align });
				doc.y += 10;
			} 

			else if (block.type === 'table') {
				doc.y += 10;
				doc.fontSize(10).font('Helvetica-Bold').fillColor(selectedTemplate === 'elegant' ? '#000000' : '#6b7280');
				
				const { headers, widths, rows } = block.content;
				
				// Prozentuale Breiten in exakte Points umrechnen
				const absWidths = widths.map((w: number) => (contentWidth * w) / 100);
				
				let currentX = 50;
				const headerY = doc.y;
				let maxHeaderH = 0;

				// Header Höhe berechnen
				headers.forEach((header: string, idx: number) => {
					const h = doc.heightOfString(header, { width: absWidths[idx] });
					if (h > maxHeaderH) maxHeaderH = h;
				});

				// Header Zeichnen (alle auf der gleichen Y-Koordinate: headerY)
				headers.forEach((header: string, idx: number) => {
					doc.text(header, currentX, headerY, { width: absWidths[idx], align: idx >= headers.length - 2 ? 'right' : 'left' });
					currentX += absWidths[idx];
				});
				
				doc.y = headerY + maxHeaderH + 5;
				doc.moveTo(50, doc.y).lineTo(pageWidth - 50, doc.y).strokeColor(primaryColor).lineWidth(1).stroke();
				doc.y += 5;

				doc.font('Helvetica').fillColor('#000000');
				
				// Zeilen Iteration
				rows.forEach((row: string[], rIndex: number) => {
					
					// Automatischer Seitenumbruch, wenn Seite fast voll ist
					if (doc.y > doc.page.height - 100) {
						doc.addPage();
						doc.y = 50;
					}

					const rowY = doc.y;
					let maxH = 0;

					// Max Höhe dieser speziellen Zeile berechnen (wg. Zeilenumbrüchen im Text)
					row.forEach((cell: string, idx: number) => {
						const h = doc.heightOfString(cell || '', { width: absWidths[idx] });
						if (h > maxH) maxH = h;
					});

					// Zebra-Muster
					if (selectedTemplate === 'modern' && rIndex % 2 !== 0) {
						doc.rect(50, rowY - 2, contentWidth, maxH + 4).fillColor('#f8fafc').fill();
						doc.fillColor('#000000');
					}

					// Zellen zeichnen (Alle auf der gleichen Y-Koordinate: rowY)
					currentX = 50;
					row.forEach((cell: string, idx: number) => {
						doc.text(cell || '', currentX, rowY, { width: absWidths[idx], align: idx >= row.length - 2 ? 'right' : 'left' });
						currentX += absWidths[idx];
					});
					
					// Cursor für die NÄCHSTE Zeile unterhalb der höchsten Zelle platzieren!
					doc.y = rowY + maxH + 5;
					
					if (selectedTemplate === 'classic') {
						doc.moveTo(50, doc.y - 2).lineTo(pageWidth - 50, doc.y - 2).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
						doc.y += 2;
					}
				});
				
				doc.moveTo(50, doc.y).lineTo(pageWidth - 50, doc.y).strokeColor(primaryColor).lineWidth(selectedTemplate === 'elegant' ? 2 : 1).stroke();
				doc.y += 15;
			} 

			else if (block.type === 'total') {
				doc.y += 10;
				const rightAlignX = pageWidth - 50 - 150; 
				doc.fontSize(10).font('Helvetica').fillColor('#000000');
				
				let currentY = doc.y;
				
				if (docMeta.taxRate > 0) {
					const net = Number(block.content) / (1 + (docMeta.taxRate/100));
					const tax = Number(block.content) - net;
					
					doc.text('Gesamt (Netto)', rightAlignX - 100, currentY, { width: 100, align: 'right' });
					doc.text(`${net.toFixed(2).replace('.', ',')} €`, rightAlignX, currentY, { width: 150, align: 'right' });
					currentY = doc.y + 2;
					
					doc.text(`Umsatzsteuer ${docMeta.taxRate}%`, rightAlignX - 100, currentY, { width: 100, align: 'right' });
					doc.text(`${tax.toFixed(2).replace('.', ',')} €`, rightAlignX, currentY, { width: 150, align: 'right' });
					currentY = doc.y + 5;
				} else {
					doc.text('Gesamt (Netto)', rightAlignX - 100, currentY, { width: 100, align: 'right' });
					doc.text(`${Number(block.content).toFixed(2).replace('.', ',')} €`, rightAlignX, currentY, { width: 150, align: 'right' });
					currentY = doc.y + 5;
				}
				
				doc.fontSize(12).font('Helvetica-Bold');
				doc.text('Gesamtsumme:', rightAlignX - 100, currentY, { width: 100, align: 'right' });
				doc.fillColor(primaryColor).text(`${Number(block.content).toFixed(2).replace('.', ',')} €`, rightAlignX, currentY, { width: 150, align: 'right' }); 
				
				doc.y = currentY + 25;
			} 

			else if (block.type === 'signature') {
				doc.y += 30;
				
				// Seitenumbruch prüfen
				if (doc.y > doc.page.height - 100) {
					doc.addPage();
					doc.y = 50;
				}
				
				const sigY = doc.y + 40;
				
				if (userSignBuffer) doc.image(userSignBuffer, 50, sigY - 40, { height: 40, fit: [150, 40], align: 'center' });
				doc.moveTo(50, sigY).lineTo(200, sigY).strokeColor('#000000').lineWidth(1).stroke();
				doc.fontSize(10).font('Helvetica').fillColor('#000000').text(`Unterschrift ${companyData?.name || 'Assistenz'}`, 50, sigY + 5, { width: 150, align: 'center' });

				const rightSigX = pageWidth - 200;
				if (clientSignBuffer) doc.image(clientSignBuffer, rightSigX, sigY - 40, { height: 40, fit: [150, 40], align: 'center' });
				doc.moveTo(rightSigX, sigY).lineTo(pageWidth - 50, sigY).strokeColor('#000000').lineWidth(1).stroke();
				doc.text('Unterschrift Klient/in', rightSigX, sigY + 5, { width: 150, align: 'center' });
				
				doc.y = sigY + 40;
			}
		});

		doc.end();

	} catch (error) {
		console.error(error);
		toastService.error('Fehler beim Rendern der PDF.');
		onError();
	}
}