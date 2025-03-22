# Custom Instructions for File Processing

This document explains the new custom instructions feature added to the TalkToDoc application, which allows users to override default processing behavior.

## Overview

The custom instructions feature enables users to provide specific directives on how they want their files to be processed. These instructions take precedence over the default system prompts and formatting guidelines.

## How It Works

1. When uploading files, users can enter custom instructions in a textarea field.
2. These instructions are passed through the application flow and directly incorporated into the system prompt sent to the AI model.
3. The AI model prioritizes these user instructions over its default formatting guidelines.

## Implementation Details

### Key Files Modified

1. `components/shared/chat/UploadArea.tsx` - Added the instructions textarea and updated UI
2. `app/api/chat/route.ts` - Modified system prompt construction to prioritize user instructions
3. `lib/utils.ts` - Updated to pass instructions to the API
4. `components/shared/chat/ChatClient.tsx` - Modified to handle instructions parameter

### UI Changes

The upload area now includes:
- A textarea labeled "Override Instructions (Optional)"
- Explanatory text informing users these instructions take precedence
- A modified button text that indicates when custom instructions are being applied
- Visual feedback showing instructions will override default settings

## Usage Examples

Users can provide various types of instructions, such as:

1. **Change content focus:**
   "Focus only on theoretical concepts, ignore practical applications"

2. **Modify formatting:**
   "Format everything as bullet points with minimal explanations"

3. **Change generation style:**
   "Create a study guide with term definitions and examples"

4. **Add specific requirements:**
   "Include only mathematical formulas and explanations, ignore everything else"

5. **Control content depth:**
   "Provide a very concise summary with only the most critical information"

## Technical Implementation

The system message sent to the AI model has been restructured to:

1. Maintain the base identity ("Expert Educational Content Creator")
2. Clearly mark user instructions as taking precedence
3. Present default guidelines as fallbacks only when user instructions don't specify structure

This ensures that user instructions truly override the defaults while still providing sensible fallbacks when instructions are partial or limited in scope.

## Benefits

1. **Customization**: Users can tailor the output to their specific needs
2. **Control**: Provides greater control over how content is processed
3. **Flexibility**: Allows for different outputs from the same source files
4. **Efficiency**: Users can get exactly what they need without post-processing 