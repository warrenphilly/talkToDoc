"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import FormattedText from "@/components/ui/formatted-text";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function MathDemoPage() {
  const [customText, setCustomText] = useState("");

  const examples = [
    {
      title: "Superscripts and Subscripts",
      examples: [
        "x^2 + y^2 = z^2",
        "H_2O is the chemical formula for water",
        "E = mc^2 is Einstein's famous equation",
      ],
    },
    {
      title: "Fractions",
      examples: [
        "The slope is rise/run",
        "3/4 + 1/4 = 1",
        "sin(x)/cos(x) = tan(x)",
      ],
    },
    {
      title: "Square Roots",
      examples: [
        "sqrt(x^2 + y^2) gives the distance from origin",
        "sqrt(25) = 5",
        "sqrt(2) is irrational",
      ],
    },
    {
      title: "Greek Letters",
      examples: [
        "alpha and beta are the first two Greek letters",
        "pi is approximately 3.14159",
        "theta is often used for angle measurement",
      ],
    },
    {
      title: "Math Operators",
      examples: [
        "sum from i=1 to n can be represented",
        "int f(x) dx is an integral",
        "lim x->0 (sin(x)/x) = 1",
      ],
    },
    {
      title: "Combined Examples",
      examples: [
        "The quadratic formula: x = (-b ± sqrt(b^2 - 4ac))/2a",
        "Pythagorean theorem: a^2 + b^2 = c^2",
        "Area of a circle: A = pi * r^2",
      ],
    },
  ];

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">ASCII Math Formatting Demo</h1>
        <p className="text-gray-600">
          See how simple ASCII math notation gets beautifully formatted
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Try Your Own</CardTitle>
          <CardDescription>
            Enter some text with ASCII math notation to see it formatted
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type math expressions like x^2 or sqrt(y)"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="flex-1"
            />
            <Button onClick={() => setCustomText("")}>Clear</Button>
          </div>

          <div className="p-4 border rounded-md min-h-20 flex items-center">
            {customText ? (
              <FormattedText text={customText} />
            ) : (
              <span className="text-gray-400">
                Enter some text above to see it formatted
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {examples.map((section, i) => (
        <Card key={i}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.examples.map((example, j) => (
                <div key={j} className="border rounded-md p-4">
                  <div className="text-sm text-gray-500 mb-2">Raw Text:</div>
                  <div className="font-mono mb-4 bg-gray-100 p-2 rounded">
                    {example}
                  </div>
                  <div className="text-sm text-gray-500 mb-2">Formatted:</div>
                  <div className="bg-white p-2 rounded">
                    <FormattedText text={example} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
