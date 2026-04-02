# frozen_string_literal: true

require_relative "eval_context"

module FeatureSignals
  class ClientOptions
    attr_reader :env_key, :base_url, :polling_interval, :streaming,
                :sse_retry, :timeout, :context

    def initialize(
      env_key:,
      base_url: "https://api.featuresignals.com",
      polling_interval: 30,
      streaming: false,
      sse_retry: 5,
      timeout: 10,
      context: EvalContext.new(key: "server")
    )
      raise ArgumentError, "env_key is required" if env_key.nil? || env_key.empty?

      @env_key = env_key
      @base_url = base_url
      @polling_interval = polling_interval
      @streaming = streaming
      @sse_retry = sse_retry
      @timeout = timeout
      @context = context
    end
  end
end
