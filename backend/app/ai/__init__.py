"""
EngageAI — AI Services Package Export
"""

from app.ai.base import BaseAIService
from app.ai.sentiment import sentiment_service, SentimentResult
from app.ai.classification import classification_service, ClassificationResult
from app.ai.topic_detection import topic_detection_service, TopicDetectionResult
from app.ai.summarization import summarization_service, SummarizationResult
from app.ai.embeddings import embedding_service, EmbeddingResult
from app.ai.duplicate_detection import duplicate_detection_service, DuplicateDetectionResult
from app.ai.clustering import clustering_service, ClusteringResult
from app.ai.priority_engine import priority_engine_service, PriorityResult
from app.ai.trend_analysis import trend_analysis_service, TrendAnalysisResult
from app.ai.feature_request_extractor import feature_request_extractor_service, FeatureExtractorResult
from app.ai.insights_generator import insights_generator_service, InsightsResult
from app.ai.nl_query_engine import nl_query_engine_service, NLQueryAnswer

__all__ = [
    "BaseAIService",
    "sentiment_service",
    "SentimentResult",
    "classification_service",
    "ClassificationResult",
    "topic_detection_service",
    "TopicDetectionResult",
    "summarization_service",
    "SummarizationResult",
    "embedding_service",
    "EmbeddingResult",
    "duplicate_detection_service",
    "DuplicateDetectionResult",
    "clustering_service",
    "ClusteringResult",
    "priority_engine_service",
    "PriorityResult",
    "trend_analysis_service",
    "TrendAnalysisResult",
    "feature_request_extractor_service",
    "FeatureExtractorResult",
    "insights_generator_service",
    "InsightsResult",
    "nl_query_engine_service",
    "NLQueryAnswer",
]
