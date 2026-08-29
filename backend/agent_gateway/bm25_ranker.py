import math
import re
from typing import List, Tuple
from backend.models.domain import SanitizedElement

def tokenize(text: str) -> List[str]:
    if not text:
        return []
    return re.findall(r'\w+', text.lower())

class BM25Ranker:

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b

    def _extract_safe_corpus(self, element: SanitizedElement) -> List[str]:
        safe_parts = []
        if element.label:
            safe_parts.append(element.label)
        if element.type:
            safe_parts.append(element.type)
        if element.role:
            safe_parts.append(element.role)
        if element.element_id:
            safe_parts.append(element.element_id.replace("_", " ").replace("-", " "))
        if element.text:
            cleaned_text = re.sub(r'\[[A-Z0-9_]+\]', '', element.text)
            if cleaned_text.strip():
                safe_parts.append(cleaned_text.strip())

        combined_text = " ".join(safe_parts)
        return tokenize(combined_text)

    def score_elements(
        self, intent: str, elements: List[SanitizedElement]
    ) -> List[Tuple[SanitizedElement, float]]:
        query_tokens = tokenize(intent)
        if not query_tokens or not elements:
            return [(elem, 0.0) for elem in elements]

        docs = [self._extract_safe_corpus(elem) for elem in elements]
        N = len(docs)
        if N == 0:
            return []

        doc_lens = [len(doc) for doc in docs]
        avgdl = sum(doc_lens) / N if N > 0 else 1.0

        df = {}
        for token in set(query_tokens):
            df[token] = sum(1 for doc in docs if token in doc)

        idf = {}
        for token, freq in df.items():
            idf[token] = math.log((N - freq + 0.5) / (freq + 0.5) + 1.0)

        results = []
        for idx, (elem, doc) in enumerate(zip(elements, docs)):
            score = 0.0
            doc_len = doc_lens[idx]
            tf = {}
            for token in doc:
                tf[token] = tf.get(token, 0) + 1

            for q_token in query_tokens:
                if q_token in tf:
                    freq = tf[q_token]
                    numerator = freq * (self.k1 + 1.0)
                    denominator = freq + self.k1 * (1.0 - self.b + self.b * (doc_len / avgdl))
                    score += idf[q_token] * (numerator / denominator)

            results.append((elem, score))

        results.sort(key=lambda x: x[1], reverse=True)
        return results

    def select_best_element(
        self, intent: str, elements: List[SanitizedElement], min_score: float = 0.001
    ) -> SanitizedElement | None:
        scored = self.score_elements(intent, elements)
        if not scored:
            return None
        top_elem, top_score = scored[0]
        if top_score >= min_score:
            return top_elem
        return None
