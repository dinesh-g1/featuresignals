# frozen_string_literal: true

module FeatureSignals
  class Error < StandardError; end

  class HttpError < Error
    attr_reader :status_code

    def initialize(status_code)
      @status_code = status_code
      super("HTTP #{status_code}")
    end
  end

  class SseError < Error
    attr_reader :status_code

    def initialize(status_code)
      @status_code = status_code
      super("SSE HTTP #{status_code}")
    end
  end
end
