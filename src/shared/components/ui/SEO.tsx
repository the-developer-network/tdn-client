import { Helmet } from "react-helmet-async";

const SITE_NAME = "TDN - The Developer Network";
const BASE_URL = "https://developernetwork.net";

interface SEOProps {
    title?: string;
    description?: string;
    canonical?: string;
}

export function SEO({ title, description, canonical }: SEOProps) {
    const pageTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : undefined;

    return (
        <Helmet>
            <title>{pageTitle}</title>
            {description && <meta name="description" content={description} />}
            {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        </Helmet>
    );
}
