import {
 Accordion,
 AccordionContent,
 AccordionItem,
 AccordionTrigger,
} from '@/components/ui/accordion';

interface FilterSectionProps {
 title: string;
 children: React.ReactNode;
 defaultOpen?: boolean;
}

export const FilterSection: React.FC<FilterSectionProps> = ({
 title,
 children,
 defaultOpen = true,
}) => {
 return (
 <Accordion
 type="single"
 collapsible
 defaultValue={defaultOpen ? 'section' : undefined}
 className="border-b border-border last:border-b-0"
 >
 <AccordionItem value="section" className="border-b-0">
 <AccordionTrigger className="px-1 text-sm font-medium uppercase tracking-wide text-foreground hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-foreground">
 {title}
 </AccordionTrigger>
 <AccordionContent className="px-1">{children}</AccordionContent>
 </AccordionItem>
 </Accordion>
 );
};
