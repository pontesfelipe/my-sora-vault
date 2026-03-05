import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const FAQ_KEYS = Array.from({ length: 17 }, (_, i) => i + 1);

export default function FAQ() {
  const { t } = useTranslation();

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{t("faq.title")}</h1>
            <p className="text-muted-foreground">{t("faq.subtitle")}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("faq.commonQuestions")}</CardTitle>
            <CardDescription>{t("faq.clickToSee")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {FAQ_KEYS.map((n) => (
                <AccordionItem key={n} value={`item-${n}`}>
                  <AccordionTrigger className="text-left">{t(`faq.q${n}`)}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{t(`faq.a${n}`)}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}