import os
import json
from typing import Dict, Any, List, Optional
from abc import ABC, abstractmethod

class LLMProvider(ABC):
    @abstractmethod
    def generate_json(self, system_prompt: str, user_prompt: str, schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate structured JSON response given system and user prompts."""
        pass

class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "gpt-4o"):
        self.api_key = api_key
        self.model = model

    def generate_json(self, system_prompt: str, user_prompt: str, schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        try:
            import requests
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": self.model,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.4
            }
            res = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=45)
            res.raise_for_status()
            data = res.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
        except Exception as e:
            raise RuntimeError(f"OpenAI API call failed: {e}")

class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022"):
        self.api_key = api_key
        self.model = model

    def generate_json(self, system_prompt: str, user_prompt: str, schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        try:
            import requests
            headers = {
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            }
            prompt = f"{user_prompt}\n\nRespond ONLY with a valid JSON object matching requirements. Do not wrap in markdown or backticks."
            payload = {
                "model": self.model,
                "system": system_prompt,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 4096,
                "temperature": 0.3
            }
            res = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload, timeout=45)
            res.raise_for_status()
            data = res.json()
            content = data["content"][0]["text"].strip()
            if content.startswith("```"):
                content = content.strip("`")
                if content.startswith("json"):
                    content = content[4:].strip()
            return json.loads(content)
        except Exception as e:
            raise RuntimeError(f"Anthropic API call failed: {e}")

class MockDeterministicAIProvider(LLMProvider):
    """
    High-fidelity deterministic AI provider.
    Produces rich, professionally structured design JSON, color intelligence,
    and chat-to-canvas operations when external API keys are not supplied.
    """
    def generate_json(self, system_prompt: str, user_prompt: str, schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        prompt_lower = user_prompt.lower()
        sys_lower = system_prompt.lower()
        
        # 1. Chat to Canvas operations
        if "canvas" in sys_lower or "chat" in sys_lower or "edit" in sys_lower or "operation" in sys_lower:
            operations = []
            explanation = "Applied canvas adjustments based on your instruction."
            
            if "right" in prompt_lower and ("photo" in prompt_lower or "portrait" in prompt_lower):
                operations.append({
                    "action": "update_element",
                    "target_type": "photo",
                    "properties": {"x": 220, "y": 65}
                })
                explanation = "Moved the student portrait frame towards the right quadrant."
            elif "left" in prompt_lower and ("photo" in prompt_lower or "portrait" in prompt_lower):
                operations.append({
                    "action": "update_element",
                    "target_type": "photo",
                    "properties": {"x": 20, "y": 65}
                })
                explanation = "Positioned the student portrait on the left sidebar."
            elif "size" in prompt_lower or "larger" in prompt_lower or "bigger" in prompt_lower:
                operations.append({
                    "action": "update_element",
                    "target_type": "text",
                    "target_field": "name",
                    "properties": {"font_size": 15, "bold": True}
                })
                explanation = "Increased the typography scale and font weight for the primary name field."
            elif "color" in prompt_lower or "navy" in prompt_lower or "blue" in prompt_lower:
                new_color = "#1e3a8a" if "navy" in prompt_lower or "blue" in prompt_lower else "#047857"
                operations.append({
                    "action": "update_element",
                    "target_type": "shape",
                    "properties": {"color": new_color}
                })
                explanation = f"Updated accent color styling to {new_color}."
            else:
                operations.append({
                    "action": "update_element",
                    "target_type": "photo",
                    "properties": {"x": 200, "y": 60}
                })
                explanation = "Adjusted layout positioning for optimal visual balance."
                
            return {
                "operations": operations,
                "explanation": explanation,
                "confidence": 0.98
            }
            
        # 2. Brand Analysis
        if "brand" in sys_lower or "extract colors" in prompt_lower:
            return {
                "primary_color": "#1e3a8a",
                "secondary_color": "#f59e0b",
                "accent_color": "#10b981",
                "background_color": "#ffffff",
                "text_color": "#1f2937",
                "font_heading": "Outfit",
                "font_body": "Inter",
                "style_keywords": ["minimal", "corporate", "modern"],
                "contrast_ratio": 7.8,
                "confidence": 0.95
            }
            
        # 3. Default: Multi-Variation Layout Generation
        org_name = "Madani Institution"
        category = "Corporate"
        if "school" in prompt_lower or "academic" in prompt_lower:
            category = "School"
        elif "hospital" in prompt_lower or "health" in prompt_lower:
            category = "Hospital"
        elif "industry" in prompt_lower or "factory" in prompt_lower:
            category = "Industrial"
            
        return {
            "variations": [
                {
                    "variation_name": "Minimal Elite Landscape",
                    "style_family": "minimal_corporate",
                    "orientation": "Landscape",
                    "card_width": 3.375,
                    "card_height": 2.125,
                    "quality_score": 98.5,
                    "front": {
                        "background_color": "#ffffff",
                        "elements": [
                            {"id": "v1-top-bar", "type": "shape", "shape_type": "rectangle", "x": 0, "y": 0, "width": 337.5, "height": 45, "color": "#1e3a8a", "fill": True},
                            {"id": "v1-org-name", "type": "text", "value": "{{organization.name}}", "x": 15, "y": 12, "width": 307.5, "height": 20, "color": "#ffffff", "font_size": 11, "bold": True, "align": "center"},
                            {"id": "v1-photo", "type": "photo", "x": 16, "y": 55, "width": 80, "height": 105},
                            {"id": "v1-name", "type": "text", "value": "{{student.name}}", "x": 115, "y": 55, "width": 205, "height": 22, "color": "#1e3a8a", "font_size": 13, "bold": True},
                            {"id": "v1-id", "type": "text", "value": "ID: {{student.id}}", "x": 115, "y": 80, "width": 205, "height": 16, "color": "#374151", "font_size": 9, "bold": True},
                            {"id": "v1-dept", "type": "text", "value": "Dept: {{student.department}}", "x": 115, "y": 98, "width": 205, "height": 14, "color": "#4b5563", "font_size": 8},
                            {"id": "v1-blood", "type": "text", "value": "Blood Group: {{student.blood_group}}", "x": 115, "y": 114, "width": 205, "height": 14, "color": "#4b5563", "font_size": 8},
                            {"id": "v1-qr", "type": "qr", "x": 260, "y": 140, "width": 45, "height": 45},
                            {"id": "v1-bottom-bar", "type": "shape", "shape_type": "rectangle", "x": 0, "y": 204, "width": 337.5, "height": 8.5, "color": "#f59e0b", "fill": True}
                        ]
                    },
                    "back": {
                        "background_color": "#f8fafc",
                        "elements": [
                            {"id": "v1-b-header", "type": "shape", "shape_type": "rectangle", "x": 0, "y": 0, "width": 337.5, "height": 20, "color": "#1e3a8a", "fill": True},
                            {"id": "v1-b-addr-lbl", "type": "text", "value": "IF FOUND RETURN TO:", "x": 15, "y": 30, "width": 307.5, "height": 14, "color": "#1e3a8a", "font_size": 7.5, "bold": True},
                            {"id": "v1-b-addr", "type": "text", "value": "{{organization.address}}", "x": 15, "y": 46, "width": 307.5, "height": 30, "color": "#374151", "font_size": 7},
                            {"id": "v1-b-terms-title", "type": "text", "value": "TERMS & CONDITIONS", "x": 15, "y": 85, "width": 307.5, "height": 14, "color": "#1e3a8a", "font_size": 7.5, "bold": True},
                            {"id": "v1-b-terms", "type": "text", "value": "1. This card is non-transferable and must be surrendered on departure.\n2. In case of loss, immediately report to the administration office.", "x": 15, "y": 100, "width": 307.5, "height": 30, "color": "#4b5563", "font_size": 6.5},
                            {"id": "v1-b-barcode", "type": "barcode", "x": 25, "y": 145, "width": 180, "height": 28},
                            {"id": "v1-b-sign", "type": "signature", "x": 220, "y": 140, "width": 90, "height": 30},
                            {"id": "v1-b-sign-lbl", "type": "text", "value": "Authorized Officer", "x": 220, "y": 172, "width": 90, "height": 12, "color": "#64748b", "font_size": 6.5, "align": "center"}
                        ]
                    }
                },
                {
                    "variation_name": "Executive Modern Portrait",
                    "style_family": "executive_modern",
                    "orientation": "Portrait",
                    "card_width": 2.125,
                    "card_height": 3.375,
                    "quality_score": 97.0,
                    "front": {
                        "background_color": "#ffffff",
                        "elements": [
                            {"id": "v2-top-banner", "type": "shape", "shape_type": "rectangle", "x": 0, "y": 0, "width": 212.5, "height": 60, "color": "#0f172a", "fill": True},
                            {"id": "v2-org-logo", "type": "logo", "x": 76, "y": 10, "width": 60, "height": 40},
                            {"id": "v2-org-title", "type": "text", "value": "{{organization.name}}", "x": 15, "y": 66, "width": 182.5, "height": 18, "color": "#0f172a", "font_size": 8.5, "bold": True, "align": "center"},
                            {"id": "v2-photo", "type": "photo", "x": 56, "y": 90, "width": 100, "height": 115},
                            {"id": "v2-name", "type": "text", "value": "{{student.name}}", "x": 15, "y": 214, "width": 182.5, "height": 22, "color": "#0f172a", "font_size": 12, "bold": True, "align": "center"},
                            {"id": "v2-id", "type": "text", "value": "ID: {{student.id}}", "x": 15, "y": 236, "width": 182.5, "height": 16, "color": "#f59e0b", "font_size": 9, "bold": True, "align": "center"},
                            {"id": "v2-role", "type": "text", "value": "{{student.designation}}", "x": 15, "y": 254, "width": 182.5, "height": 14, "color": "#475569", "font_size": 8, "align": "center"},
                            {"id": "v2-qr", "type": "qr", "x": 84, "y": 274, "width": 44, "height": 44}
                        ]
                    },
                    "back": {
                        "background_color": "#0f172a",
                        "elements": [
                            {"id": "v2-b-header", "type": "text", "value": "EMERGENCY & RETURN", "x": 15, "y": 20, "width": 182.5, "height": 16, "color": "#f59e0b", "font_size": 8.5, "bold": True, "align": "center"},
                            {"id": "v2-b-addr", "type": "text", "value": "{{organization.address}}\nPhone: {{organization.phone}}", "x": 15, "y": 42, "width": 182.5, "height": 40, "color": "#e2e8f0", "font_size": 7, "align": "center"},
                            {"id": "v2-b-barcode", "type": "barcode", "x": 16, "y": 110, "width": 180, "height": 30},
                            {"id": "v2-b-auth", "type": "text", "value": "ISSUED BY AUTHORITY", "x": 15, "y": 200, "width": 182.5, "height": 14, "color": "#94a3b8", "font_size": 7, "align": "center"}
                        ]
                    }
                },
                {
                    "variation_name": "Emerald Eco High-Contrast",
                    "style_family": "healthcare_industrial",
                    "orientation": "Landscape",
                    "card_width": 3.375,
                    "card_height": 2.125,
                    "quality_score": 99.0,
                    "front": {
                        "background_color": "#ffffff",
                        "elements": [
                            {"id": "v3-sidebar", "type": "shape", "shape_type": "rectangle", "x": 0, "y": 0, "width": 95, "height": 212.5, "color": "#047857", "fill": True},
                            {"id": "v3-photo", "type": "photo", "x": 15, "y": 55, "width": 72, "height": 90},
                            {"id": "v3-logo", "type": "logo", "x": 18, "y": 12, "width": 60, "height": 38},
                            {"id": "v3-org-title", "type": "text", "value": "{{organization.name}}", "x": 110, "y": 16, "width": 215, "height": 22, "color": "#047857", "font_size": 11, "bold": True},
                            {"id": "v3-name", "type": "text", "value": "{{student.name}}", "x": 110, "y": 55, "width": 215, "height": 24, "color": "#111827", "font_size": 13, "bold": True},
                            {"id": "v3-id", "type": "text", "value": "BADGE #: {{student.id}}", "x": 110, "y": 82, "width": 215, "height": 16, "color": "#047857", "font_size": 9, "bold": True},
                            {"id": "v3-dept", "type": "text", "value": "Division: {{student.department}}", "x": 110, "y": 102, "width": 215, "height": 14, "color": "#4b5563", "font_size": 8},
                            {"id": "v3-barcode", "type": "barcode", "x": 110, "y": 130, "width": 160, "height": 28},
                            {"id": "v3-qr", "type": "qr", "x": 275, "y": 125, "width": 45, "height": 45}
                        ]
                    },
                    "back": {
                        "background_color": "#ecfdf5",
                        "elements": [
                            {"id": "v3-b-top", "type": "shape", "shape_type": "rectangle", "x": 0, "y": 0, "width": 337.5, "height": 15, "color": "#047857", "fill": True},
                            {"id": "v3-b-notice", "type": "text", "value": "SECURITY NOTICE", "x": 20, "y": 28, "width": 297.5, "height": 14, "color": "#047857", "font_size": 8, "bold": True},
                            {"id": "v3-b-rules", "type": "text", "value": "Display at all times while on site. Report security violations immediately.", "x": 20, "y": 45, "width": 297.5, "height": 24, "color": "#1f2937", "font_size": 7},
                            {"id": "v3-b-addr", "type": "text", "value": "Address: {{organization.address}}", "x": 20, "y": 80, "width": 297.5, "height": 24, "color": "#4b5563", "font_size": 7}
                        ]
                    }
                }
            ]
        }

def get_ai_provider() -> LLMProvider:
    """Factory to return configured AI driver based on environment variables."""
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key and not openai_key.startswith("your_"):
        return OpenAIProvider(api_key=openai_key)
        
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key and not anthropic_key.startswith("your_"):
        return AnthropicProvider(api_key=anthropic_key)
        
    # Default to High-fidelity Mock Driver for robust offline/local execution
    return MockDeterministicAIProvider()
