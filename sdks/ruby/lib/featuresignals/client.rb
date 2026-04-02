# frozen_string_literal: true

require "net/http"
require "json"
require "uri"
require "logger"

require_relative "client_options"
require_relative "eval_context"

module FeatureSignals
  # Main SDK client. Fetches flag values from the server, caches locally,
  # and keeps them up-to-date via polling or SSE streaming.
  # All flag reads are local — zero network calls per evaluation after init.
  class Client
    def initialize(sdk_key, options, on_ready: nil, on_error: nil, on_update: nil)
      raise ArgumentError, "sdk_key is required" if sdk_key.nil? || sdk_key.empty?

      @sdk_key = sdk_key
      @options = options
      @flags = {}
      @lock = Mutex.new
      @ready = false
      @ready_mutex = Mutex.new
      @ready_cv = ConditionVariable.new
      @closed = false
      @closed_mutex = Mutex.new
      @closed_cv = ConditionVariable.new

      @on_ready = on_ready
      @on_error = on_error
      @on_update = on_update

      @logger = Logger.new($stderr)
      @logger.progname = "featuresignals"
      @logger.level = Logger::WARN

      begin
        refresh
        mark_ready
      rescue StandardError => e
        emit_error(e)
      end

      @bg_thread = if options.streaming
                     Thread.new { sse_loop }
                   else
                     Thread.new { poll_loop }
                   end
      @bg_thread.abort_on_exception = false
    end

    # ── Flag access ─────────────────────────────────────────

    def bool_variation(key, _ctx, fallback)
      val = get_flag(key)
      val == true || val == false ? val : fallback
    end

    def string_variation(key, _ctx, fallback)
      val = get_flag(key)
      val.is_a?(String) ? val : fallback
    end

    def number_variation(key, _ctx, fallback)
      val = get_flag(key)
      val.is_a?(Numeric) ? val : fallback
    end

    def json_variation(key, _ctx, fallback)
      val = get_flag(key)
      val.nil? ? fallback : val
    end

    def all_flags
      @lock.synchronize { @flags.dup }
    end

    def ready?
      @ready_mutex.synchronize { @ready }
    end

    def wait_for_ready(timeout: 10)
      deadline = Time.now + timeout
      @ready_mutex.synchronize do
        until @ready
          remaining = deadline - Time.now
          return false if remaining <= 0
          @ready_cv.wait(@ready_mutex, remaining)
        end
        true
      end
    end

    def close
      @closed_mutex.synchronize do
        @closed = true
        @closed_cv.broadcast
      end
      @bg_thread&.join(2)
    end

    private

    def get_flag(key)
      @lock.synchronize { @flags[key] }
    end

    def set_flags(flags)
      @lock.synchronize { @flags = flags }
      @on_update&.call(flags.dup)
    rescue StandardError
      # swallow callback errors
    end

    def mark_ready
      @ready_mutex.synchronize do
        return if @ready
        @ready = true
        @ready_cv.broadcast
      end
      @on_ready&.call
    rescue StandardError
      # swallow callback errors
    end

    def emit_error(exc)
      @logger.error(exc.message)
      @on_error&.call(exc)
    rescue StandardError
      # swallow callback errors
    end

    def closed?
      @closed_mutex.synchronize { @closed }
    end

    def wait_closed(seconds)
      @closed_mutex.synchronize do
        return true if @closed
        @closed_cv.wait(@closed_mutex, seconds)
        @closed
      end
    end

    def refresh
      env_key = URI.encode_www_form_component(@options.env_key)
      ctx_key = URI.encode_www_form_component(@options.context.key)
      url = URI("#{@options.base_url}/v1/client/#{env_key}/flags?key=#{ctx_key}")

      http = Net::HTTP.new(url.host, url.port)
      http.use_ssl = url.scheme == "https"
      http.open_timeout = @options.timeout
      http.read_timeout = @options.timeout

      request = Net::HTTP::Get.new(url)
      request["X-API-Key"] = @sdk_key
      request["Accept"] = "application/json"

      response = http.request(request)
      raise "HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)

      data = JSON.parse(response.body)
      set_flags(data)
    end

    def poll_loop
      until wait_closed(@options.polling_interval)
        begin
          refresh
          mark_ready
        rescue StandardError => e
          emit_error(e)
        end
      end
    end

    def sse_loop
      until closed?
        begin
          connect_sse
        rescue StandardError => e
          break if closed?
          emit_error(e)
        end
        break if closed?
        wait_closed(@options.sse_retry)
      end
    end

    def connect_sse
      env_key = URI.encode_www_form_component(@options.env_key)
      api_key = URI.encode_www_form_component(@sdk_key)
      url = URI("#{@options.base_url}/v1/stream/#{env_key}?api_key=#{api_key}")

      http = Net::HTTP.new(url.host, url.port)
      http.use_ssl = url.scheme == "https"

      request = Net::HTTP::Get.new(url)
      request["Accept"] = "text/event-stream"
      request["Cache-Control"] = "no-cache"

      http.request(request) do |response|
        raise "SSE HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)

        event_type = ""
        response.read_body do |chunk|
          return if closed?

          chunk.each_line do |line|
            line = line.chomp
            if line.start_with?("event:")
              event_type = line[6..].strip
            elsif line.start_with?("data:")
              if event_type == "flag-update"
                begin
                  refresh
                rescue StandardError => e
                  emit_error(e)
                end
              end
              event_type = ""
            end
          end
        end
      end
    end
  end
end
