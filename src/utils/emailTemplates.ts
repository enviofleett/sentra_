
export const getEmailTemplate = (title: string, bodyContent: string) => {
  // Convert newlines to <br> for the body content if it's plain text and doesn't contain HTML tags
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(bodyContent);
  const formattedBody = hasHtmlTags ? bodyContent : bodyContent.replace(/\n/g, '<br>');

  return `
<!DOCTYPE html> 
 <html> 
 <head> 
   <meta charset="utf-8"> 
   <meta name="viewport" content="width=device-width,initial-scale=1.0"> 
   <title>${title}</title>
 </head> 
 <body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;"> 
   <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;padding:40px 20px;"> 
     <tr> 
       <td align="center"> 
         <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:600px;"> 
           <tr> 
             <td style="padding:20px 0;text-align:center;"> 
               <img src="https://www.sentra.africa/assets/sentra-logo-DOJvbc4f.png" alt="Sentra" width="120" style="display:block;margin:0 auto 16px;"/> 
               <p style="color:#888888;font-size:12px;margin:0;letter-spacing:2px;">PREMIUM FRAGRANCES</p> 
             </td> 
           </tr> 
           
           <tr> 
             <td style="padding:20px 40px;"> 
               <h2 style="color:#000000;font-size:24px;margin:0 0 16px;text-align:center;">${title}</h2> 
               <div style="color:#333333;font-size:16px;line-height:1.6;margin:0 0 20px;text-align:center;">
                 ${formattedBody}
               </div>
               
               <p style="color:#666666;font-size:14px;line-height:1.6;margin:40px 0 0;text-align:center;"> 
                 To your success,<br> 
                 <strong style="color:#000000;">The Sentra Team</strong> 
               </p> 
             </td> 
           </tr> 
         </table> 
       </td> 
     </tr> 
   </table> 
 </body> 
 </html>
  `;
};
