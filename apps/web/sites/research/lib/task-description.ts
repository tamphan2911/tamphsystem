export const defaultSubmitTaskDescription = `Prepare and submit this manuscript.
 - Go to submit --> create a folder, name it by the journal which we submit this manuscript to --> copy the manuscript file & title page file to this folder
 - Check make sure the information in title page match with author information in the site (name, order, corresponding, email..., and match with the manuscript file (title, abstract, keywords, JEL)
 - Check if the manuscript file anonymous, if any information of authors, institution still in the manuscript, delete them
 - Login to submission portal of the journal by account given in task info, submit the manuscript by following the process of the journal
 - Make sure information of authors in metadata of the submission match with title page & the research site (name, order, corresponding, email), this is very important, most cases we could not change information of authors after submit.
If anything confuse, request clarify or contact admin`;

export const defaultSuggestVenueTaskDescription = `Create suggested venue in research detail page (2 suggestions)
 - If the venue is already in the site system, search and pick it
 - If the venue is not in the site system, put name & URL --> submit form --> admin will review and add that venue later
Go to research shared folder, read the manuscript (normally in submit folder), and suggest venue
The suggested venue must: 
 - Scope of journal must be suitable with the content of the research (could look for some articles in recent issues for more detail)
 - In Scopus, prefer Q3 and above (Q4 is ok but prefer higher)
 - Do not suggest journal which already in suggested venues (on site), and has sub-folder in submit folder
 - Low APC (below $200 for Q3, below $1.500 for Q1, higher APC for top rank is ok, admin will review it) or has Subscription option (no APC)`;
