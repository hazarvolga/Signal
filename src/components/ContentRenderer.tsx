import React from 'react';
import { AmpSurveyPreview } from './AmpSurveyPreview';
import { AmpProductPreview } from './AmpProductPreview';

export const ContentRenderer = ({ content, campaignId, contactId, className = "prose prose-sm font-serif" }: { content: string, campaignId: string, contactId: string, className?: string }) => {
  if (!content) return null;
  
  // Regex to match [[AMP_SURVEY:Question|Option1,Option2]] and [[AMP_PRODUCT:Name|Price|Button]]
  const widgetRegex = /\[\[(AMP_SURVEY|AMP_PRODUCT):(.*?)\|(.*?)\]\]/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = widgetRegex.exec(content)) !== null) {
    // Add the HTML before the match
    if (match.index > lastIndex) {
      parts.push(
        <div 
          key={`html-${lastIndex}`} 
          className={className}
          dangerouslySetInnerHTML={{ __html: content.substring(lastIndex, match.index) }} 
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
    }

    lastIndex = widgetRegex.lastIndex;
  }

  // Add the remaining HTML
  if (lastIndex < content.length) {
    parts.push(
      <div 
        key={`html-${lastIndex}`} 
        className={className}
        dangerouslySetInnerHTML={{ __html: content.substring(lastIndex) }} 
      />
    );
  }

  return <div className="content-renderer">{parts}</div>;
};
