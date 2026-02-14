import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqItems = [
  {
    question: "What is Luxury Vault?",
    answer: "Luxury Vault is a comprehensive watch collection management platform designed to help enthusiasts track, organize, and analyze their luxury timepieces. It provides tools for logging usage history, managing trips and events, tracking activities, and gaining insights into your collection."
  },
  {
    question: "What can I track about my watches?",
    answer: "Luxury Vault supports detailed watch specifications including movement type, case material, case size, water resistance, power reserve, lug-to-lug measurements, warranty tracking, rarity, and historical significance."
  },
  {
    question: "How do I add a watch to my collection?",
    answer: "Navigate to the Collection page and click the 'Add Item' button. Fill in the details about your watch including brand, model, and specifications. You can also upload photos and additional documentation like warranty cards or authenticity certificates."
  },
  {
    question: "What is the Wishlist feature?",
    answer: "The Wishlist allows you to keep track of watches you're interested in acquiring. You can add items with their brand, model, and preferred specifications. The system can also match your wishlist with other users who have those watches available for trade."
  },
  {
    question: "How does the Trade Matching work?",
    answer: "When you mark a watch as 'Open to Trade', the system automatically matches it with other users' wishlists. If there's a match, both parties receive a notification and can connect to discuss a potential exchange."
  },
  {
    question: "What is Water Usage tracking?",
    answer: "Water Usage tracking allows you to log activities where you've used your watch in water (swimming, diving, etc.). This is useful to monitor water exposure and track water resistance over time."
  },
  {
    question: "How do I log a wear entry?",
    answer: "You can log entries from multiple places: the Home page, the Watch Detail page, or the Collection page. Simply select the watch and date, and optionally associate it with a trip, event, or water activity."
  },
  {
    question: "What are Collection Insights?",
    answer: "Collection Insights provides AI-powered analysis of your collection, including taste preferences, usage patterns, and suggestions for watches that might complement your collection."
  },
  {
    question: "Can I share my collection with others?",
    answer: "Yes! You can add friends through the Messages feature and share watch details with them. You can also grant other users viewer or editor access to your collection."
  },
  {
    question: "How do I track warranties and authenticity?",
    answer: "When adding or editing a watch, you can set warranty dates and upload photos of warranty cards or authenticity certificates. The system will track warranty status and notify you before warranties expire."
  },
  {
    question: "What data is stored about my watches?",
    answer: "Luxury Vault stores comprehensive information including brand, model, specifications, purchase details, photos, documentation, usage history, and personal notes. All data is securely stored and only accessible to you and users you grant access to."
  },
  {
    question: "Is my data secure?",
    answer: "Yes, we take security seriously. All data is encrypted in transit and at rest. We use row-level security policies to ensure you can only access your own data. Authentication is handled securely through industry-standard protocols."
  },
  {
    question: "How can I export my data?",
    answer: "Administrators can export usage logs and other data through the Admin panel. Individual users can view all their data through the various pages and reports in the application."
  }
];

export default function FAQ() {
  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Frequently Asked Questions</h1>
            <p className="text-muted-foreground">
              Find answers to common questions about Luxury Vault
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Common Questions</CardTitle>
            <CardDescription>
              Click on a question to see the answer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}