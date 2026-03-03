import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqItems = [
  {
    question: "What is Luxury Vault?",
    answer: "Luxury Vault is a comprehensive collection management platform for luxury enthusiasts. It supports multiple collection types — watches, sneakers, and purses — giving you tools to track, organize, analyze, and share your prized items all in one place."
  },
  {
    question: "What collection types are supported?",
    answer: "Luxury Vault currently supports three collection types: Watches (with specs like movement, case material, water resistance, and power reserve), Sneakers (with specs like colorway, shoe size, SKU, condition, and collaboration details), and Purses (with specs like material, hardware color, closure type, and authenticity verification). Each type has its own tailored tracking fields."
  },
  {
    question: "How do I create a collection?",
    answer: "After signing in, you'll be prompted to create your first collection. Choose a name and select a type (watches, sneakers, or purses). You can create multiple collections of different types and switch between them using the collection switcher."
  },
  {
    question: "How do I add an item to my collection?",
    answer: "Navigate to the Collection page and click the 'Add Item' button. Fill in the details such as brand, model, and type-specific specifications. You can also upload photos and documentation like warranty cards or authenticity certificates."
  },
  {
    question: "What is the Wear Tracking feature?",
    answer: "Wear Tracking lets you log when you use an item from your collection. You can associate entries with trips, events, sports activities, or water usage. Over time, you'll see usage patterns through calendars, charts, and monthly grids."
  },
  {
    question: "What are Trips and Events?",
    answer: "Trips and Events let you document special occasions and associate them with the items you wore. Track locations, dates, duration, and which pieces accompanied you — building a timeline of memories with your collection."
  },
  {
    question: "What is the Wishlist feature?",
    answer: "The Wishlist lets you track items you're interested in acquiring. Add brand, model, and preferred specs. The system can also match your wishlist with other users who have those items available for trade."
  },
  {
    question: "How does Trade Matching work?",
    answer: "When you mark an item as 'Open to Trade', the system automatically matches it with other users' wishlists. If there's a match, both parties receive a notification and can connect through messaging to discuss a potential exchange."
  },
  {
    question: "What is Water Usage tracking?",
    answer: "Water Usage tracking lets you log activities where you've used a watch in water (swimming, diving, snorkeling, etc.). This helps monitor water exposure relative to your watch's water resistance rating."
  },
  {
    question: "What are Collection Insights and AI features?",
    answer: "Luxury Vault offers several AI-powered features: Collection Insights analyzes your taste profile and usage patterns, Sentiment Analysis evaluates your feelings about each item, Watch Metadata Analysis enriches specs automatically, and the Vault Pal chatbot assistant answers questions about your collection."
  },
  {
    question: "Can I share my collection with others?",
    answer: "Yes! You can add friends through the social features and share item details via messaging. You can also grant other users viewer or editor access to your collections. The Forum lets you post and discuss with the community."
  },
  {
    question: "What is the Trust Level system?",
    answer: "Trust Levels (Observer, Collector, Verified Collector, Trusted Trader) reflect a user's standing in the community. Higher trust levels are assigned by admins based on activity and completed trades, helping users gauge reliability for trade opportunities."
  },
  {
    question: "How do warranties and authenticity work?",
    answer: "When adding or editing an item, you can set warranty dates and upload warranty card or authenticity certificate photos. The system tracks warranty status and sends notifications before warranties expire."
  },
  {
    question: "What Personal Notes and Lists can I create?",
    answer: "Personal Notes let you keep private observations about your items. Lists allow you to organize items into custom groupings beyond your main collection — for example, 'Daily Rotation', 'Grails', or 'For Sale'."
  },
  {
    question: "Is my data secure?",
    answer: "Yes. All data is encrypted in transit and at rest. Row-level security policies ensure you can only access your own data. Two-factor authentication (MFA) and login history tracking are available for additional account protection."
  },
  {
    question: "How can I export my data?",
    answer: "Administrators can export watch inventory, wear logs, and full data exports through the Admin panel. The platform also supports importing data via spreadsheet upload."
  },
  {
    question: "How do I submit feedback or report issues?",
    answer: "Use the 'Submit Feedback' option available in the app to send bug reports, feature requests, or general feedback directly to the admin team. You can track the status of your submissions as well."
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
