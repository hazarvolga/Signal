import React from 'react';
import { AmpSurveyPreview } from './AmpSurveyPreview';
import { AmpProductPreview } from './AmpProductPreview';
import { ReferralWidgetPreview } from './ReferralWidgetPreview';

export const ContentRenderer = ({ content, campaignId, contactId, contact, className = "prose prose-sm font-serif" }: { content: string, campaignId: string, contactId: string, contact?: any, className?: string }) => {
  if (!content) return null;

  // Process DYNAMIC blocks first
  // Format: [[DYNAMIC:field=value|Content]]
  let processedContent = content;
  const dynamicRegex = /\[\[DYNAMIC:([a-zA-Z0-9_]+)=([^|]+)\|(.*?)\]\]/g;
  processedContent = processedContent.replace(dynamicRegex, (match, field, value, innerContent) => {
    if (!contact) {
      // If no contact context (e.g., in general preview), show it with a dashed border to indicate it's dynamic
      return `<div style="border: 1px dashed #ccc; padding: 8px; margin: 8px 0; position: relative;">
        <span style="position: absolute; top: -8px; left: 8px; background: white; font-size: 10px; color: #666; padding: 0 4px;">Dynamic: ${field}=${value}</span>
        ${innerContent}
      </div>`;
    }
    
    // Evaluate condition
    const contactValue = contact[field] || (contact.tags && contact.tags.includes(value) ? value : null);
    if (contactValue && contactValue.toString().toLowerCase() === value.toLowerCase()) {
      return innerContent;
    }
    return ''; // Hide if condition not met
  });
  
  // Regex to match [[AMP_SURVEY:Question|Option1,Option2]], [[AMP_PRODUCT:Name|Price|Button]], and [[REFERRAL_WIDGET]]
  const widgetRegex = /\[\[(AMP_SURVEY|AMP_PRODUCT|REFERRAL_WIDGET)(?::(.*?)\|(.*?))?\]\]/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = widgetRegex.exec(processedContent)) !== null) {
    // Add the HTML before the match
    if (match.index > lastIndex) {
      parts.push(
        <div 
          key={`html-${lastIndex}`} 
          className={className}
          dangerouslySetInnerHTML={{ __html: processedContent.substring(lastIndex, match.index) }} 
        />
      );
    }

    const type = match[1];
    
    if (type === 'AMP_SURVEY') {
      const question = match[2];
      const options = match[3].split(',').map(s => s.trim());
      parts.push(
        <AmpSurveyPreview 
          key={`amp-${match.index}`} 
          campaignId={campaignId} 
          contactId={contactId} 
          question={question} 
          options={options} 
        />
      );
    } else if (type === 'AMP_PRODUCT') {
      const productName = match[2];
      const [price, buttonText] = match[3].split('|').map(s => s.trim());
      parts.push(
        <AmpProductPreview 
          key={`amp-${match.index}`} 
          campaignId={campaignId} 
          contactId={contactId} 
          productName={productName} 
          price={price}
          buttonText={buttonText || 'Buy Now'}
        />
      );
    } else if (type === 'REFERRAL_WIDGET') {
      parts.push(
        <ReferralWidgetPreview 
          key={`ref-${match.index}`} 
          contact={contact}
        />
      );
    }

    lastIndex = widgetRegex.lastIndex;
  }

  // Add the remaining HTML
  if (lastIndex < processedContent.length) {
    parts.push(
      <div 
        key={`html-${lastIndex}`} 
        className={className}
        dangerouslySetInnerHTML={{ __html: processedContent.substring(lastIndex) }} 
      />
    );
  }

  return <div className="content-renderer">{parts}</div>;
};
