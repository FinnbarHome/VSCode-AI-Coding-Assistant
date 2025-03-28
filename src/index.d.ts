declare module 'markdown-pdf' {
    function markdownpdf(options?: any): {
        from(markdownPath: string): {
            to(pdfPath: string, callback?: (err: Error | null) => void): void;
        };
    };
    
    export default markdownpdf;
} 